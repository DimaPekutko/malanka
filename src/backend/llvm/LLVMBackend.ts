import BaseBackend from "./../../backend/BaseBackend";
import { ArrayDeclStmNode, ArrayExprNode, ArrayMemberAssignStmNode, ArrayMemberNode, AssignStmNode, AstNode, BinOpNode, BlockStmNode, EOFStmNode, ForStmNode, FuncCallStmNode, FuncDeclStmNode, IfStmNode, LiteralNode, ProgramNode, ReturnStmNode, SharedImpStmNode, TypeNode, UnOpNode, VarDeclStmNode, VarNode } from "frontend/AST/AST";
import { INodeVisitor } from "./../../frontend/AST/INodeVisitor";
import { SymbolManager } from "./../../frontend/SymbolManager";
import path from "path";
import llvm from "llvm-bindings";
import { dump, LogManager, uid } from "./../../utils";
import { DATA_TYPES } from "./../../frontend/DataTypes";
import { COMPILER_CONFIG } from "./../../config/CompilerConfig";
import { exit } from "process";
import { TOKEN_TYPES } from "./../../frontend/SyntaxAnalyzer/Tokens";
import assert from "assert";
import AllocaManager from "./AllocaManager";


export class LLVMBackend extends BaseBackend implements INodeVisitor {
  ast: AstNode
  symbol_manager: SymbolManager
  alloca_manager: AllocaManager
  ctx: llvm.LLVMContext
  builder: llvm.IRBuilder
  cur_module: llvm.Module
  func_scopes_stack: llvm.Function[]

  _debug_printf_func: llvm.Function | null = null

  constructor(ast: AstNode, symbol_manager: SymbolManager) {
    super(ast, symbol_manager)
    this.ast = ast
    this.symbol_manager = symbol_manager
    this.alloca_manager = new AllocaManager()
    this.ctx = new llvm.LLVMContext()
    this.builder = new llvm.IRBuilder(this.ctx)
    this.cur_module = new llvm.Module("main_module", this.ctx)
    this.func_scopes_stack = []
  }
  visit_ProgramNode(node: ProgramNode): llvm.Value {

    llvm.InitializeAllTargetInfos()
    llvm.InitializeAllTargets()
    llvm.InitializeAllTargetMCs()
    llvm.InitializeAllAsmParsers()
    llvm.InitializeAllAsmPrinters()

    this._debug_printf_func = llvm.Function.Create(
      llvm.FunctionType.get(llvm.Type.getInt32Ty(this.ctx), true),
      llvm.Function.LinkageTypes.ExternalLinkage,
      "printf",
      this.cur_module
    )

    // // Creating main function
    // const main_proto = llvm.FunctionType.get(
    //   llvm.Type.getInt32Ty(this.ctx),
    //   false
    // )

    // const main_func = llvm.Function.Create(
    //   main_proto,
    //   llvm.Function.LinkageTypes.ExternalLinkage,
    //   "main",
    //   this.cur_module
    // )

    // this.alloca_manager.set_global_scope(main_func)

    // // all statements will be located at main funcion scope
    // this.func_scopes_stack.push(main_func)
    // this.create_new_bb(main_func)
    this.visit(node.body)
    // this.func_scopes_stack.pop()

    // this.builder.CreateRet(llvm.ConstantInt.get(
    //   this.ctx,
    //   new llvm.APInt(32, 0, true)
    // ))

    return this._debug_printf_func
  }
  visit_BlockStmNode(node: BlockStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    node.children.forEach(stm => {
      this.visit(stm)
    })

    return parent_func
  }
  visit_AssignStmNode(node: AssignStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    const var_type = this.get_llvm_type(node.type)
    const var_value = this.visit(node.value)

    const alloca = this.create_entry_block_alloca(parent_func, node.name, var_type)
    this.builder.CreateStore(var_value, alloca)

    const load = this.builder.CreateLoad(var_type, alloca)
    this.debug_printf(node.name + "=%d\n", [load])

    this.alloca_manager.set(parent_func, node.name, alloca)

    return var_value
  }
  visit_BinOpNode(node: BinOpNode): llvm.Value {
    const op = node.token.type
    const is_float_op = node.type.name === DATA_TYPES.name
    const lhs = this.visit(node.left)
    const rhs = this.visit(node.right)

    // arithmetic
    if (op === TOKEN_TYPES.plus_op) {
      return is_float_op ?
        this.builder.CreateFAdd(lhs, rhs, "addtmp") :
        this.builder.CreateAdd(lhs, rhs, "addtmp")
    }
    else if (op === TOKEN_TYPES.minus_op) {
      return is_float_op ?
        this.builder.CreateFSub(lhs, rhs, "subtmp") :
        this.builder.CreateSub(lhs, rhs, "subtmp")
    }
    else if (op === TOKEN_TYPES.mul_op) {
      return is_float_op ?
        this.builder.CreateFMul(lhs, rhs, "multmp") :
        this.builder.CreateMul(lhs, rhs, "multmp")
    }
    else if (op === TOKEN_TYPES.div_op) {
      return is_float_op ?
        this.builder.CreateFDiv(lhs, rhs, "divtmp") :
        this.builder.CreateSDiv(lhs, rhs, "divtmp")
    }

    // logic
    if (op === TOKEN_TYPES.or_op) {
      return this.builder.CreateOr(lhs, rhs, "ortmp")
    }
    else if (op === TOKEN_TYPES.and_op) {
      // cast operands to i1 and compare
      const i1_result = this.builder.CreateAnd(
        this.builder.CreateIntCast(lhs, llvm.Type.getInt1Ty(this.ctx), true),
        this.builder.CreateIntCast(rhs, llvm.Type.getInt1Ty(this.ctx), true),
        "andtmp",
      )

      // convert back to type
      return this.builder.CreateIntCast(i1_result, lhs.getType(), false)
    }

    // comp
    if (op === TOKEN_TYPES.greater_op) {
      const res = is_float_op ?
        this.builder.CreateFCmpOGT(lhs, rhs, "cmp_gt_tmp") :
        this.builder.CreateICmpSGT(lhs, rhs, "cmp_gt_tmp")
      return this.builder.CreateIntCast(res, lhs.getType(), false)
    }
    else if (op === TOKEN_TYPES.greater_equal_op) {
      const res = is_float_op ?
        this.builder.CreateFCmpOGE(lhs, rhs, "cmp_ge_tmp") :
        this.builder.CreateICmpSGE(lhs, rhs, "cmp_ge_tmp")
      return this.builder.CreateIntCast(res, lhs.getType(), false)
    }
    else if (op === TOKEN_TYPES.less_op) {
      const res = is_float_op ?
        this.builder.CreateFCmpOLT(lhs, rhs, "cmp_lt_tmp") :
        this.builder.CreateICmpSLT(lhs, rhs, "cmp_lt_tmp")
      return this.builder.CreateIntCast(res, lhs.getType(), false)
    }
    else if (op === TOKEN_TYPES.less_op) {
      const res = is_float_op ?
        this.builder.CreateFCmpOLE(lhs, rhs, "cmp_le_tmp") :
        this.builder.CreateICmpSLE(lhs, rhs, "cmp_le_tmp")
      return this.builder.CreateIntCast(res, lhs.getType(), false)
    }
    else if (op === TOKEN_TYPES.equal_op) {
      const res = is_float_op ?
        this.builder.CreateFCmpOEQ(lhs, rhs, "cmp_eq_tmp") :
        this.builder.CreateICmpEQ(lhs, rhs, "cmp_eq_tmp")
      return this.builder.CreateIntCast(res, lhs.getType(), false)
    }

    return lhs
  }
  visit_UnOpNode(node: UnOpNode): void {
    throw new Error("Method not implemented.");
  }
  visit_LiteralNode(node: LiteralNode): llvm.Value {
    if (node.type.name === DATA_TYPES.int) {
      const _const = llvm.ConstantInt.get(
        this.ctx,
        new llvm.APInt(32, parseInt(node.token.value), true)
      )
      return _const
    }
    else if (node.type.name === DATA_TYPES.str) {
      return this.builder.CreateGlobalStringPtr(node.token.value)
    }

    return this.builder.CreateRetVoid()
  }
  visit_IfStmNode(node: IfStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ForStmNode(node: ForStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_FuncDeclStmNode(node: FuncDeclStmNode): llvm.Value {
    const func_ret_type: llvm.Type = this.get_llvm_type(node.ret_type)
    const func_params_types: llvm.Type[] = []
    node.params.map((param) => {
      func_params_types.push(this.get_llvm_type(param.type))
    })

    const func_proto = llvm.FunctionType.get(
      func_ret_type,
      func_params_types,
      false
    )

    const func = llvm.Function.Create(
      func_proto,
      llvm.Function.LinkageTypes.ExternalLinkage,
      node.func_name,
      this.cur_module
    )

    this.alloca_manager.new_scope(func)

    
    this.func_scopes_stack.push(func)
    // creating basic block
    this.create_new_bb(func)
    // filling params
    for (let i = 0; i < node.params.length; i++) {
      const param = node.params[i]
      const param_type = this.get_llvm_type(param.type)
      const alloca = this.builder.CreateAlloca(param_type, null, param.name)
      this.builder.CreateStore(func.getArg(i), alloca)
      this.alloca_manager.set(func, param.name, alloca)
    }
    // generating body
    this.visit(node.body)
    this.func_scopes_stack.pop()

    if (node.ret_type.name === DATA_TYPES.void) {
      this.builder.CreateRetVoid()
    }

    // this.builder.SetInsertPoint(this.get_parent_func().getExitBlock())
    llvm.verifyFunction(func)

    return func
  }
  visit_ReturnStmNode(node: ReturnStmNode): llvm.Value {
    const expr = this.visit(node.expr)
    this.builder.CreateRet(expr)
    return expr
  }
  visit_VarDeclStmNode(node: VarDeclStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    const var_type = this.get_llvm_type(node.type)
    const var_value = this.visit(node.init_value)

    // console.log(var_value)

    const alloca = this.create_entry_block_alloca(parent_func, node.var_name, var_type)
    this.builder.CreateStore(var_value, alloca)

    this.alloca_manager.set(parent_func, node.var_name, alloca)

    return var_value
  }
  visit_ArrayDeclStmNode(node: ArrayDeclStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ArrayExprNode(node: ArrayExprNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ArrayMemberNode(node: ArrayMemberNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ArrayMemberAssignStmNode(node: ArrayMemberAssignStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_VarNode(node: VarNode): llvm.Value {
    const parent_func = this.get_parent_func()
    const var_type = this.get_llvm_type(node.type)
    const alloca = this.alloca_manager.get(parent_func, node.name)!

    const loaded_var =  this.builder.CreateLoad(var_type, alloca)
    return loaded_var
  }
  visit_FuncCallStmNode(node: FuncCallStmNode): llvm.Value {    
    const target_func = this.cur_module.getFunction(node.func_name)
    assert(target_func, 
      `Cannot find function "${node.func_name}" in llvm "${this.cur_module.getName()}" module!`)

    const func_args: llvm.Value[] = []
    node.args.map((arg) => {
      func_args.push(this.visit(arg))
    })

    // should not pass func name if target function return type
    // is void (llvm rules)
    if (node.type && node.type.name === DATA_TYPES.void) {
      return this.builder.CreateCall(target_func, func_args)
    }
    else {
      return this.builder.CreateCall(target_func, func_args)
    }
  }
  visit_SharedImpStmNode(node: SharedImpStmNode): void {

  }
  visit_EOFStmNode(node: EOFStmNode): void {

  }
  visit(node: AstNode): llvm.Value {
    // It's dirty, but there are no need to write a complex if else structure
    let visit_method = "this.visit_" + node.constructor.name + "(node)"
    return eval(visit_method)
  }
  debug_printf(str: string, args: llvm.Value[]): void {
    const global_str = this.builder.CreateGlobalString(
      str, uid(5), 500, this.cur_module)

    args.unshift(global_str)

    this.builder.CreateCall(this._debug_printf_func!, args, "printf")
  }
  get_parent_func(): llvm.Function {
    return this.func_scopes_stack[this.func_scopes_stack.length - 1]
  }
  get_llvm_type(type_node: TypeNode): llvm.Type {
    switch (type_node.name) {
      case DATA_TYPES.int:
        return llvm.Type.getInt32Ty(this.ctx)
      case DATA_TYPES.doub:
        return llvm.Type.getDoubleTy(this.ctx)
      default:
        return llvm.Type.getVoidTy(this.ctx)
    }
  }
  create_new_bb(func: llvm.Function): llvm.BasicBlock {
    const basic_block = llvm.BasicBlock.Create(this.ctx, uid(5), func)
    this.builder.SetInsertPoint(basic_block)
    return basic_block
  }
  create_entry_block_alloca(func: llvm.Function, name: string, type: llvm.Type): llvm.AllocaInst {
    const sub_builder = new llvm.IRBuilder(func.getEntryBlock())
    const alloca = sub_builder.CreateAlloca(type, null, name)
    return alloca
  }
  compile(): void {
    const result = this.visit(this.ast)
    console.log(this.cur_module.print())

    let triple = llvm.config.LLVM_DEFAULT_TARGET_TRIPLE
    this.cur_module.setTargetTriple(triple)
    llvm.WriteBitcodeToFile(this.cur_module, COMPILER_CONFIG.output_file + ".bc")
  }

}
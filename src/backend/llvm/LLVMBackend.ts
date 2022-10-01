import BaseBackend from "./../../backend/BaseBackend";
import { ArrayDeclStmNode, ArrayExprNode, ArrayMemberAssignStmNode, ArrayMemberNode, AssignStmNode, AstNode, BinOpNode, BlockStmNode, EOFStmNode, ForStmNode, FuncCallStmNode, FuncDeclStmNode, IfStmNode, LiteralNode, ProgramNode, ReturnStmNode, SharedImpStmNode, TypeNode, UnOpNode, VarDeclStmNode, VarNode } from "frontend/AST/AST";
import { INodeVisitor } from "./../../frontend/AST/INodeVisitor";
import { SymbolManager } from "./../../frontend/SymbolManager";
import path from "path";
import llvm from "llvm-bindings";
import { dump, uid } from "./../../utils";
import { DATA_TYPES } from "./../../frontend/DataTypes";
import { COMPILER_CONFIG } from "./../../config/CompilerConfig";
import { exit } from "process";


export class LLVMBackend extends BaseBackend implements INodeVisitor {
  ast: AstNode
  symbol_manager: SymbolManager
  ctx: llvm.LLVMContext
  builder: llvm.IRBuilder
  cur_module: llvm.Module
  func_scopes_stack: llvm.Function[]

  _debug_printf_func: llvm.Function | null = null

  constructor(ast: AstNode, symbol_manager: SymbolManager) {
    super(ast, symbol_manager)
    this.ast = ast
    this.symbol_manager = symbol_manager
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

    // Creating main function
    const main_proto = llvm.FunctionType.get(
      llvm.Type.getInt32Ty(this.ctx),
      false
    )

    const main_func = llvm.Function.Create(
      main_proto,
      llvm.Function.LinkageTypes.ExternalLinkage,
      "main",
      this.cur_module
    )

    // all statements will be located at main funcion scope
    this.func_scopes_stack.push(main_func)
    this.visit(node.body)
    this.func_scopes_stack.pop()

    this.builder.CreateRet(llvm.ConstantInt.get(
      this.ctx,
      new llvm.APInt(32, 0, true)
    ))

    return main_func
  }
  visit_BlockStmNode(node: BlockStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    const basic_block = llvm.BasicBlock.Create(this.ctx, uid(5), parent_func)
    this.builder.SetInsertPoint(basic_block)

    node.children.forEach(stm => {
      this.visit(stm)
    })

    return basic_block
  }
  visit_AssignStmNode(node: AssignStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    const var_type = this.get_llvm_type(node.type)
    const var_value = this.visit(node.value)

    const alloca = this.create_entry_block_alloca(parent_func, node.name, var_type)
    this.builder.CreateStore(var_value, alloca)

    return var_value
  }
  visit_BinOpNode(node: BinOpNode): void {
    throw new Error("Method not implemented.");
  }
  visit_UnOpNode(node: UnOpNode): void {
    throw new Error("Method not implemented.");
  }
  visit_LiteralNode(node: LiteralNode): llvm.Value {
    const _const = llvm.ConstantInt.get(
      this.ctx,
      new llvm.APInt(32, parseInt(node.token.value), true)
    )
    return _const
  }
  visit_IfStmNode(node: IfStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ForStmNode(node: ForStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_FuncDeclStmNode(node: FuncDeclStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_ReturnStmNode(node: ReturnStmNode): void {
    throw new Error("Method not implemented.");
  }
  visit_VarDeclStmNode(node: VarDeclStmNode): llvm.Value {
    const parent_func = this.get_parent_func()

    const var_type = this.get_llvm_type(node.type)
    const var_value = this.visit(node.init_value)
    
    const alloca = this.create_entry_block_alloca(parent_func, node.var_name, var_type)
    this.builder.CreateStore(var_value, alloca)
  
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
  visit_VarNode(node: VarNode): void {
    throw new Error("Method not implemented.");
  }
  visit_FuncCallStmNode(node: FuncCallStmNode): void {
    throw new Error("Method not implemented.");
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
    return this.func_scopes_stack[this.func_scopes_stack.length-1]
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
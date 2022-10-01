import BaseBackend from "./../../backend/BaseBackend";
import { ArrayDeclStmNode, ArrayExprNode, ArrayMemberAssignStmNode, ArrayMemberNode, AssignStmNode, AstNode, BinOpNode, BlockStmNode, EOFStmNode, ForStmNode, FuncCallStmNode, FuncDeclStmNode, IfStmNode, LiteralNode, ProgramNode, ReturnStmNode, SharedImpStmNode, UnOpNode, VarDeclStmNode, VarNode } from "frontend/AST/AST";
import { INodeVisitor } from "./../../frontend/AST/INodeVisitor";
import { SymbolManager } from "./../../frontend/SymbolManager";
import path from "path";
import llvm from "llvm-bindings";
import { dump } from "utils";
import { DATA_TYPES } from "./../../frontend/DataTypes";
import { COMPILER_CONFIG } from "./../../config/CompilerConfig";
import { exit } from "process";


export class LLVMBackend extends BaseBackend implements INodeVisitor {
  ast: AstNode
  symbol_manager: SymbolManager
  ctx: llvm.LLVMContext
  builder: llvm.IRBuilder
  cur_module: llvm.Module

  constructor(ast: AstNode, symbol_manager: SymbolManager) {
    super(ast, symbol_manager)
    this.ast = ast
    this.symbol_manager = symbol_manager
    this.ctx = new llvm.LLVMContext()
    this.builder = new llvm.IRBuilder(this.ctx)
    this.cur_module = new llvm.Module("main_module", this.ctx)
  }
  visit_ProgramNode(node: ProgramNode): void {

    llvm.InitializeAllTargetInfos()
    llvm.InitializeAllTargets()
    llvm.InitializeAllTargetMCs()
    llvm.InitializeAllAsmParsers()
    llvm.InitializeAllAsmPrinters()

    this.visit(node.body)

  }
  visit_BlockStmNode(node: BlockStmNode): llvm.Value {
    throw new Error("Method not implemented.");

    node.children.forEach(stm => {
      this.visit(stm)
    })

  }
  visit_AssignStmNode(node: AssignStmNode): void {
    throw new Error("Method not implemented.");
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
    // const proto  = llvm.FunctionType.get(
      // llvm.GlobalVariable
      throw 42
    //   this.builder.getInt32Ty(), 
    //   true
    // );
    // const printf = llvm.Function.Create(
    //   proto, 
    //   llvm.Function.LinkageTypes.ExternalLinkage, 
    //   "printf", 
    //   this.cur_module)
    
    // const scope = llvm.Function.Create(
    //   llvm.FunctionType.get(llvm.Type.getVoidTy(this.ctx), [], false),
    //   llvm.Function.LinkageTypes.ExternalLinkage,
    //   "main",
    //   this.cur_module
    // )
  
    // const entry = llvm.BasicBlock.Create(this.ctx, 'entry', scope);
    // this.builder.SetInsertPoint(entry)

    // const alloca = this.builder.CreateAlloca(
    //   llvm.Type.getInt32Ty(this.ctx),
    //   null,
    //   node.var_name
    // )

    
    // const str = this.builder.CreateGlobalStringPtr("wtf %d \n")
    // const expr = this.visit(node.init_value)
    
    // this.builder.CreateStore(expr, alloca);
    
    // const load = this.builder.CreateLoad(
    //   llvm.Type.getInt32Ty(this.ctx),
    //   alloca,
    //   node.var_name
    // )
    
    // // console.log(load)
    // // alloc
    
    // this.builder.CreateCall(printf, [str, load])
    // this.builder.CreateRet(expr)
    
    // let triple = llvm.config.LLVM_DEFAULT_TARGET_TRIPLE
    // this.cur_module.setTargetTriple(triple)

    // llvm.WriteBitcodeToFile(this.cur_module, COMPILER_CONFIG.output_file+".bc")

    // return scope

    // // const a = this.builder

    // const expr: any = this.visit(node.init_value)

    // const _var = new llvm.GlobalVariable(
    //   llvm.Type.getInt32Ty(this.ctx),
    //   false,
    //   llvm.GlobalValue.LinkageTypes.CommonLinkage,
    //   null,
    //   node.var_name
    // )

    // _var.setInitializer(expr)
    // this.cur_module.

    // return _var
    // return expr
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

  compile(): void {
    const result = this.visit(this.ast)
    console.log(this.cur_module.print())
  }

}
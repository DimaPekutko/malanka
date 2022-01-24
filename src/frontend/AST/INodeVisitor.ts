import {ProgramNode, BinOpNode, UnOpNode, LiteralNode, AstNode, BlockStmNode, AssignStmNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode} from "./AST"

export interface INodeVisitor {
    visit_ProgramNode(node: ProgramNode): void
    visit_BlockStmNode(node: BlockStmNode): void
    visit_AssignStmNode(node: AssignStmNode): void
    visit_BinOpNode(node: BinOpNode): void
    visit_UnOpNode(node: UnOpNode): void
    visit_LiteralNode(node: LiteralNode): void
    visit_VarDeclStmNode(node: VarDeclStmNode): void
    visit_VarNode(node: VarNode): void
    visit_FuncCallStmNode(node: FuncCallStmNode): void
    visit_SharedImpStmNode(node: SharedImpStmNode): void
    visit_EOFStmNode(node: EOFStmNode): void
    visit(node: AstNode): void
}
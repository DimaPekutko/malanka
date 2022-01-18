import {BinOpNode, UnOpNode, NumLiteralNode, AstNode} from "frontend/AST/AST"

export interface INodeVisitor {
    visit_BinOpNode(node: BinOpNode): void
    visit_UnOpNode(node: UnOpNode): void
    visit_NumLiteralNode(node: NumLiteralNode): void
    visit(node: AstNode): void
}
import { ProgramNode, BlockStmNode, AssignStmNode, BinOpNode, UnOpNode, LiteralNode, VarNode, AstNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode } from 'frontend/AST/AST';
import { INodeVisitor } from 'frontend/AST/INodeVisitor';
import { SymbolManager } from 'frontend/SymbolManager';

export class SemanticAnalyzer implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    constructor(ast: AstNode, symbol_manager: SymbolManager) {
        this.ast = ast
        this.symbol_manager = symbol_manager
    }
    visit_ProgramNode(node: ProgramNode): void {
        this.visit(node.body)
    }
    visit_BlockStmNode(node: BlockStmNode): void {
        node.children.forEach(stm => {
            this.visit(stm)
        })
    }
    visit_AssignStmNode(node: AssignStmNode): void {
        let var_name: string = node.name
        this.visit(node.value)
    }
    visit_BinOpNode(node: BinOpNode): void {
        this.visit(node.left)
        this.visit(node.right)
    }
    visit_UnOpNode(node: UnOpNode): void {
        this.visit(node.left)
    }
    visit_LiteralNode(node: LiteralNode): void {
       
    }
    visit_VarDeclStmNode(node: VarDeclStmNode): void {
        this.visit(node.init_value)
    }
    visit_VarNode(node: VarNode): void {
       
    }
    visit_FuncCallStmNode(node: FuncCallStmNode): void {
        let args = node.args
        args.forEach(arg => {
            this.visit(arg)
        })
    }
    visit_SharedImpStmNode(node: SharedImpStmNode): void {
        this.symbol_manager.load_shared_symbols(node.str.token.value)
    }
    visit_EOFStmNode(node: EOFStmNode): void {
        
    }
    visit(node: AstNode): any {
        // It's dirty, but there are no need to write a complex if else structure
        let visit_method = "this.visit_"+node.constructor.name+"(node)"
        return eval(visit_method)
    }
    analyze(): void {
        this.visit(this.ast)
    }
}
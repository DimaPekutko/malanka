import { is_float, is_int } from './../../utils';
import { TypeNode, IfStmNode, ForStmNode, FuncDeclStmNode } from './../AST/AST';
import { TypeSymbol, FuncSymbol } from './../SymbolManager';
import { LogManager, dump } from 'utils';
import { ProgramNode, BlockStmNode, AssignStmNode, BinOpNode, UnOpNode, LiteralNode, VarNode, AstNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode } from 'frontend/AST/AST';
import { INodeVisitor } from 'frontend/AST/INodeVisitor';
import { SymbolManager, VarSymbol } from 'frontend/SymbolManager';
import { DATA_TYPES } from 'frontend/DataTypes';

export class SemanticAnalyzer implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    private current_type: TypeNode | null = null
    constructor(ast: AstNode, symbol_manager: SymbolManager) {
        this.ast = ast
        this.symbol_manager = symbol_manager
    }
    private eat_type(type: TypeNode | null): void {
        // clearing current_type (success type checking case)
        if (type === null) {
            this.current_type = null
            return
        }
        // set initial type
        else if(this.current_type === null) {
            this.current_type = type
            return
        }
        // type matching error
        if(this.current_type.name !== type.name) {
            LogManager.error(
                `Invalid types: ${this.current_type.name} !== ${type.name}`,
                "SemanticAnalyzer.ts"
            )
        }
    }
    visit_ProgramNode(node: ProgramNode): void {
        let data_types = Object.entries(DATA_TYPES)
        let type_name
        data_types.forEach(type => {
            type_name = type[0]
            this.symbol_manager.GLOBAL_SCOPE.set(type_name, new TypeSymbol(type_name))
        })
        this.visit(node.body)
    }
    visit_BlockStmNode(node: BlockStmNode): void {
        node.children.forEach(stm => {
            this.eat_type(null)
            this.visit(stm)
        })
    }
    visit_AssignStmNode(node: AssignStmNode): void {
        let var_name: string = node.name
        if (this.symbol_manager.GLOBAL_SCOPE.get(var_name) === undefined) {
            LogManager.error(
                `Symbol ${var_name} did not declared.`,
                "SemanticAnalyzer.ts"
            )
        }
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
        let value = node.token.value
        // int case
        if (is_int(Number(value))) {
            value = String(value).split(".")[0]
            node.type = new TypeNode(DATA_TYPES.int)
        }
        // float case
        else if (is_float(Number(value))) {
            node.type = new TypeNode(DATA_TYPES.doub)
        }
        // string case
        else {
            node.type = new TypeNode(DATA_TYPES.str)
        }
        this.eat_type(node.type)
    }
    visit_IfStmNode(node: IfStmNode): void {
        if (node.condition !== null) {
            this.visit(node.condition)
        }
        this.visit(node.body)
    }
    visit_ForStmNode(node: ForStmNode): void {
        this.visit(node.init_stm)
        this.visit(node.condition)
        this.visit(node.update_stm)
        this.visit(node.body)
    }
    visit_FuncDeclStmNode(node: FuncDeclStmNode): void {
        let func_name = node.func_name
        let type_name = node.ret_type.name
        this.visit(node.body)
        if (this.symbol_manager.GLOBAL_SCOPE.get(func_name) === undefined) {
            if (this.symbol_manager.GLOBAL_SCOPE.get(type_name) instanceof TypeSymbol) {
                this.symbol_manager.GLOBAL_SCOPE.set(func_name, new FuncSymbol(func_name))
            }
            else {
                LogManager.error(
                    `Undefined typename '${type_name}'.`,
                    "SemanticAnalyzer.ts"
                )
            }
        }
        else {
            LogManager.error(
                `Symbol '${type_name}' already declared`,
                "SemanticAnalyzer.ts"
            )
        }
    }
    visit_VarDeclStmNode(node: VarDeclStmNode): void {
        let var_name = node.var_name
        let var_type_name = node.type.name
        this.visit(node.init_value)
        this.eat_type(node.type)
        this.eat_type(null) // clearing current_type (success type checking case)
        if (this.symbol_manager.GLOBAL_SCOPE.get(var_name) === undefined) {
            if (this.symbol_manager.GLOBAL_SCOPE.get(var_type_name) instanceof TypeSymbol) {
                this.symbol_manager.GLOBAL_SCOPE.set(var_name, new VarSymbol(var_name, node.type))
            }
            else {
                LogManager.error(
                    `Undefined typename '${var_type_name}'.`,
                    "SemanticAnalyzer.ts"
                )
            }
        }
        else {
            LogManager.error(
                `Symbol '${var_name}' already declared`,
                "SemanticAnalyzer.ts"
            )
        }
    }
    visit_VarNode(node: VarNode): void {
        let var_name = node.name
        let defined_var = this.symbol_manager.GLOBAL_SCOPE.get(var_name)
        if (!(defined_var instanceof VarSymbol)) {
            LogManager.error(
                `Symbol '${var_name}' did not declared.`,
                "SemanticAnalyzer.ts"
            )
        }
    }
    visit_FuncCallStmNode(node: FuncCallStmNode): void {
        let func_name = node.func_name
        let args = node.args
        if (this.symbol_manager.GLOBAL_SCOPE.get(func_name) === undefined) {
            LogManager.error(
                `Symbol ${func_name} did not declared.`,
                "SemanticAnalyzer.ts"
            )
        }
        args.forEach(arg => {
            this.eat_type(null)
            this.visit(arg)
        })
    }
    visit_SharedImpStmNode(node: SharedImpStmNode): void {
        this.symbol_manager.load_shared_symbols(node.str)
    }
    visit_EOFStmNode(node: EOFStmNode): void {
        
    }
    visit(node: AstNode): any {
        // It's dirty, but there are no need to write a complex if else structure
        let visit_method = "this.visit_"+node.constructor.name+"(node)"
        // LogManager.log(`Visiting ${visit_method}`, "SemanticAnalyzer.ts")
        return eval(visit_method)
    }
    analyze(): void {
        this.visit(this.ast)
    }
}
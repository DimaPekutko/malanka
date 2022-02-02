import { is_float, is_int } from './../../utils';
import { TypeNode, IfStmNode, ForStmNode, FuncDeclStmNode, ReturnStmNode } from './../AST/AST';
import { TypeSymbol, FuncSymbol, SymbolTable, ScopeTypes } from './../SymbolManager';
import { LogManager, dump } from 'utils';
import { ProgramNode, BlockStmNode, AssignStmNode, BinOpNode, UnOpNode, LiteralNode, VarNode, AstNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode } from 'frontend/AST/AST';
import { INodeVisitor } from 'frontend/AST/INodeVisitor';
import { SymbolManager, VarSymbol } from 'frontend/SymbolManager';
import { DATA_TYPES } from 'frontend/DataTypes';

export class SemanticAnalyzer implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    private current_scope: SymbolTable | null = null
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
        this.current_scope = this.symbol_manager.new_scope(node.body.uid, 0, null)
        data_types.forEach(type => {
            type_name = type[0]
            this.current_scope?.set(type_name, new TypeSymbol(type_name))
        })
        node.body.children.forEach(stm => {
            this.eat_type(null)
            this.visit(stm)
        })
        // dump(this.symbol_manager)

    }
    visit_BlockStmNode(node: BlockStmNode): void {
        // creating new scope
        this.current_scope = this.symbol_manager.new_scope(
            node.uid,
            this.current_scope?.nesting_lvl!+1,
            this.current_scope,
            ScopeTypes.default_scope
        )

        node.children.forEach(stm => {
            this.eat_type(null)
            this.visit(stm)
        })

        // come back to parent scope
        this.current_scope = this.current_scope.parent_scope
    }
    visit_AssignStmNode(node: AssignStmNode): void {
        let var_name: string = node.name
        if (this.current_scope?.get(var_name) === null) {
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
        
        if (this.current_scope?.get(func_name) !== null) {
            LogManager.error(
                `Symbol '${type_name}' already declared`,
                "SemanticAnalyzer.ts"
                );
        }
        
        if (!(this.current_scope?.get(type_name) instanceof TypeSymbol)) {
            LogManager.error(
                `Undefined typename '${type_name}'.`,
                "SemanticAnalyzer.ts"
                );
        }

        const func_symbol = new FuncSymbol(func_name)
        func_symbol.params = node.params

        // push new func symbol in global scope
        this.current_scope?.set(func_name, func_symbol)
        
        // creating new scope
        this.current_scope = this.symbol_manager.new_scope(
            node.body.uid,
            this.current_scope?.nesting_lvl!+1,
            this.current_scope,
            ScopeTypes.func_scope
        )
        
        // filling params in func scope
        node.params.forEach(param => {
            this.current_scope?.set(param.name, new VarSymbol(param.name, param.type))
        })

        node.body.children.forEach(stm => {
            this.eat_type(null)
            this.visit(stm)
        })

        // come back to parent scope
        this.current_scope = this.current_scope.parent_scope        
    }
    visit_ReturnStmNode(node: ReturnStmNode): void {
        this.visit(node.expr)
    }
    visit_VarDeclStmNode(node: VarDeclStmNode): void {
        let var_name = node.var_name
        let var_type_name = node.type.name
        this.visit(node.init_value)
        this.eat_type(node.type)
        this.eat_type(null) // clearing current_type (success type checking case)
        if (this.current_scope?.get_local(var_name) === null) {
            if (this.current_scope?.get(var_type_name) instanceof TypeSymbol) {
                this.current_scope?.set(var_name, new VarSymbol(var_name, node.type))
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
        let defined_var = this.current_scope?.get(var_name)
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
        let defined_func = this.current_scope?.get(func_name)
        if (defined_func === null) {
            LogManager.error(
                `Symbol ${func_name} did not declared.`,
                "SemanticAnalyzer.ts"
            )
        }
        if (defined_func instanceof FuncSymbol) {
            // checking funccall rules if defined_func is user defined function only
            args.forEach(arg => {
                this.eat_type(null)
                this.visit(arg)
            })
        }
    }
    visit_SharedImpStmNode(node: SharedImpStmNode): void {
        if (this.current_scope?.nesting_lvl !== 0) {
            LogManager.error(
                `You can import dynamic libraries in global scope only`,
                "SemanticAnalyzer.ts"
            )
        }
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
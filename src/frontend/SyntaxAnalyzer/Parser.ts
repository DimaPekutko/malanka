import { dump, is_float, is_int } from './../../utils';
import { ProgramNode, AstStatementNode, BlockStmNode, AssignStmNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode, TypeNode, IfStmNode, ForStmNode, FuncDeclStmNode, ParamNode, ReturnStmNode, ArrayDeclStmNode, ArrayExprNode, TypedAstNode, ArrayMemberNode } from './../AST/AST';
import { AstNode, BinOpNode, LiteralNode, UnOpNode } from "./../../frontend/AST/AST"
import { Token, TokenType, TOKEN_TYPES } from './Tokens'
import { exit, LogManager } from './../../utils';
import { DATA_TYPES } from './../../frontend/DataTypes';


export class Parser {
    private tokens: Token[]
    private current_token!: Token
    private TABS_COUNT = 0
    constructor(tokens: Token[]) {
        this.tokens = tokens
        this.get_next_token()
    }
    private get_next_token(): Token {
        this.current_token = this.tokens.shift()!        
        return this.current_token
    }
    private skip_gaps(): void {
        while(
            this.current_token.type === TOKEN_TYPES.new_line) {
            this.get_next_token()
        }
    }
    private skip_new_lines(): void {
        while(this.current_token.type === TOKEN_TYPES.new_line) {
            this.get_next_token()
        }
    }
    private skip_tabs(): number {
        let count = 0
        while(this.current_token.type === TOKEN_TYPES.tab) {
            this.get_next_token()
            count++
        }
        return count
    }
    private eat(type: TokenType): void {
        if(this.current_token.type.name === type.name) {
            this.get_next_token()
        }
        else {
            LogManager.error(
                `Unexpected token '${this.current_token.value}' but required ${type.name} token type in ${this.current_token.row}:${this.current_token.col}.`,
                "Parser.ts"
            )
        }
    }
    private peek(): Token {
        return this.tokens[0]
    }
    private parse_type(): TypeNode {
        this.eat(TOKEN_TYPES.type_mark)
        let type_name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        // pointer declaration
        if (this.current_token.type === TOKEN_TYPES.mul_op) {
            this.eat(TOKEN_TYPES.mul_op)
            let node = new TypeNode(DATA_TYPES.pointer)
            node.points_to_type = type_name
            return node
        }
        return new TypeNode(type_name)
    }
    private parse_stm_list(is_program_block: boolean = false): AstStatementNode[] {
        let statements: AstStatementNode[] = []
        let stm!: AstStatementNode

        // program scope parsing
        if (is_program_block) {
            while (!(stm instanceof EOFStmNode)) {
                this.skip_gaps()
                stm = this.parse_stm()
                statements.push(stm)
                if (this.current_token.type !== TOKEN_TYPES.EOF && 
                    !(stm instanceof IfStmNode)
                ) {
                    this.eat(TOKEN_TYPES.new_line)
                    this.skip_new_lines()
                }
            }
        }
        // just regular block parsing
        else {
            this.skip_gaps()
            while (
                this.current_token.type !== TOKEN_TYPES.end_key &&
                this.current_token.type !== TOKEN_TYPES.elif &&
                this.current_token.type !== TOKEN_TYPES.else
            ) {
                stm = this.parse_stm()
                statements.push(stm)
                if (this.current_token.type !== TOKEN_TYPES.end_key) {
                    this.eat(TOKEN_TYPES.new_line)
                }
                this.skip_gaps()
            }
        }
        return statements
    } 
    private parse_program(): ProgramNode {
        let statements: AstStatementNode[] = this.parse_stm_list(true)
        return new ProgramNode(new BlockStmNode(statements))
    }
    private parse_block_stm(): BlockStmNode {
        this.eat(TOKEN_TYPES.block_start)
        this.eat(TOKEN_TYPES.new_line)
        let statements: AstStatementNode[] = this.parse_stm_list()
        if (
            this.current_token.type !== TOKEN_TYPES.elif && 
            this.current_token.type !== TOKEN_TYPES.else
        ) {
            this.eat(TOKEN_TYPES.end_key)
        }
        return new BlockStmNode(statements)
    }
    private parse_stm(): AstStatementNode {        
        if(this.current_token.type === TOKEN_TYPES.identifier) {
            let next_token = this.peek()
            // funccall case
            if(next_token.type === TOKEN_TYPES.lpar) {
                return this.parse_funccall()
            }
            // var declaration case
            else if(next_token.type === TOKEN_TYPES.type_mark) {
                return this.parse_vardecl()
            }
            // array declaration case
            else if (next_token.type === TOKEN_TYPES.lbrace) {
                return this.parse_arraydecl()
            }
            // assignment case
            else {
                return this.parse_assignment()
            }
        }
        else if (this.current_token.type === TOKEN_TYPES.if) {
            return this.parse_if()
        }
        else if (this.current_token.type === TOKEN_TYPES.for) {
            return this.parse_for()
        }
        else if (this.current_token.type === TOKEN_TYPES.func_decl_mark) {
            return this.parse_funcdecl()
        }
        else if (this.current_token.type === TOKEN_TYPES.return_mark) {
            return this.parse_return()
        }
        else if (this.current_token.type === TOKEN_TYPES.shared_import_key) {
            return this.parse_shared_import()
        }
        else if (this.current_token.type === TOKEN_TYPES.EOF) {
            return new EOFStmNode()
        }
        else {
            LogManager.error(
                `Unexpected statement in ${this.current_token.row}:${this.current_token.col}.`,
                "Parser.ts"
            )
            process.exit()
        }
    }
    private parse_assignment(): AssignStmNode {
        let name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        this.eat(TOKEN_TYPES.assign_op)
        let value = this.parse_bin_expr()
        return new AssignStmNode(name, value)
    }
    private parse_vardecl(): VarDeclStmNode {
        let name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        let type = this.parse_type()
        this.eat(TOKEN_TYPES.assign_op)
        return new VarDeclStmNode(name, type, this.parse_bin_expr())
    }
    private parse_arraydecl(): ArrayDeclStmNode {
        let name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        let size = this.parse_arraydecl_size()
        let type = this.parse_type()
        this.eat(TOKEN_TYPES.assign_op)
        let array_expr = this.parse_array_expr(name, size, 0)
        return new ArrayDeclStmNode(name, type, size, array_expr)
    }
    private parse_arraydecl_size(): number[] {
        let sizes: number[] = []
        do {
            this.eat(TOKEN_TYPES.lbrace)
            sizes.push(parseInt(this.current_token.value))
            this.eat(TOKEN_TYPES.number)
            this.eat(TOKEN_TYPES.rbrace)
        } while(this.current_token.type === TOKEN_TYPES.lbrace)
        return sizes
    }
    private parse_array_expr(arr_name: string, arr_size: number[], depth: number = 0): ArrayExprNode {
        let arr: TypedAstNode[] = [] 
        this.skip_new_lines()
        this.eat(TOKEN_TYPES.lbracket)
        do {
            arr.length !== 0 ? this.eat(TOKEN_TYPES.comma) : null
            this.skip_new_lines()
            if (this.current_token.type === TOKEN_TYPES.lbracket) {
                arr.push(this.parse_array_expr(arr_name, arr_size, depth+1))
            }
            else {
                arr.push(this.parse_bin_expr())
            }
            this.skip_new_lines()
        } while(this.current_token.type !== TOKEN_TYPES.rbracket)
        this.eat(TOKEN_TYPES.rbracket)
        return new ArrayExprNode(arr,arr_name,arr_size,depth)
    }
    private parse_array_member(): ArrayMemberNode {
        let array_name: string = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        let index: TypedAstNode[] = []
        do {
            this.eat(TOKEN_TYPES.lbracket)
            index.push(this.parse_bin_expr())
            this.eat(TOKEN_TYPES.rbracket)
        } while(this.current_token.type === TOKEN_TYPES.lbracket)
        return new ArrayMemberNode(array_name, index)
    }
    private parse_funccall(): FuncCallStmNode {
        let name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        let args = this.parse_args()
        return new FuncCallStmNode(name, args)
    }
    private parse_args(): AstNode[] {
        let args: AstNode[] = []
        this.eat(TOKEN_TYPES.lpar)
        while(this.current_token.type !== TOKEN_TYPES.rpar) {
            args.length !== 0 ? this.eat(TOKEN_TYPES.comma) : null
            args.push(this.parse_bin_expr())
        }
        this.eat(TOKEN_TYPES.rpar)
        return args
    }
    private parse_if(): IfStmNode {
        this.eat(TOKEN_TYPES.if)
        let condition = this.parse_bin_expr()        
        let body = this.parse_block_stm()
        let node = new IfStmNode(condition, body) 
        if (this.current_token.type === TOKEN_TYPES.elif) {
            node.alternate = this.parse_elif()
        }
        else if (this.current_token.type === TOKEN_TYPES.else) {
            node.alternate = this.parse_else()
        }
        return node
    }
    private parse_elif(): IfStmNode {
        this.eat(TOKEN_TYPES.elif)
        let condition = this.parse_bin_expr()
        let body = this.parse_block_stm()
        let node = new IfStmNode(condition, body)         
        if (this.current_token.type === TOKEN_TYPES.elif) {
            node.alternate = this.parse_elif()
        }
        else if (this.current_token.type === TOKEN_TYPES.else) {
            node.alternate = this.parse_else()
        }
        return node
    }
    private parse_else(): IfStmNode {
        this.eat(TOKEN_TYPES.else)
        let condition = null
        let body = this.parse_block_stm()
        let node = new IfStmNode(condition, body) 
        return node
    }
    private parse_for(): ForStmNode {
        this.eat(TOKEN_TYPES.for)
        let init_stm = this.parse_vardecl()
        this.eat(TOKEN_TYPES.semicolon)
        let condition = this.parse_bin_expr()
        this.eat(TOKEN_TYPES.semicolon)
        let udpate_stm = this.parse_assignment()
        let body = this.parse_block_stm()
        let node = new ForStmNode(init_stm, condition, udpate_stm, body)
        return node
    }
    private parse_funcdecl(): FuncDeclStmNode {
        this.eat(TOKEN_TYPES.func_decl_mark)
        let func_name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        let ret_type = this.parse_type()
        let params = this.parse_params()
        let body = this.parse_block_stm()
        let node = new FuncDeclStmNode(func_name, ret_type, params, body)
        return node
    }
    private parse_params(): ParamNode[] {
        let params: ParamNode[] = []
        if (this.current_token.type === TOKEN_TYPES.params_mark) {
            this.eat(TOKEN_TYPES.params_mark)
            let name: string
            let type: TypeNode
            do {
                if (params.length > 0) {
                    this.eat(TOKEN_TYPES.comma)
                }
                name = this.current_token.value
                this.eat(TOKEN_TYPES.identifier)
                type = this.parse_type()
                params.push(new ParamNode(name, type))
            } while(this.current_token.type === TOKEN_TYPES.comma)
        }
        return params
    }
    private parse_return(): ReturnStmNode {
        this.eat(TOKEN_TYPES.return_mark)
        return new ReturnStmNode(this.parse_bin_expr())
    }
    private parse_shared_import(): SharedImpStmNode {
        this.eat(TOKEN_TYPES.shared_import_key)
        let dist = this.current_token.value
        this.eat(TOKEN_TYPES.string)
        return new SharedImpStmNode(dist)
    }
    private parse_bin_expr(): TypedAstNode {
        return this.parse_logic()
    }
    private parse_logic(): TypedAstNode {
        let node = this.parse_comparation()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.and_op ||
            this.current_token.type === TOKEN_TYPES.or_op 
        ) {
            op = this.current_token;
            if(op.type === TOKEN_TYPES.and_op) {
                this.eat(TOKEN_TYPES.and_op)
            }
            else if(op.type === TOKEN_TYPES.or_op) {
                this.eat(TOKEN_TYPES.or_op)
            }
            node = new BinOpNode(node, op, this.parse_comparation())
        }
        return node
    }
    private parse_comparation(): TypedAstNode {
        let node = this.parse_expr()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.greater_equal_op ||
            this.current_token.type === TOKEN_TYPES.greater_op ||
            this.current_token.type === TOKEN_TYPES.less_equal_op ||
            this.current_token.type === TOKEN_TYPES.less_op ||
            this.current_token.type === TOKEN_TYPES.equal_op
        ) {
            op = this.current_token;
            if(op.type === TOKEN_TYPES.greater_equal_op) {
                this.eat(TOKEN_TYPES.greater_equal_op)
            }
            else if(op.type === TOKEN_TYPES.greater_op) {
                this.eat(TOKEN_TYPES.greater_op)
            }
            else if(op.type === TOKEN_TYPES.less_equal_op) {
                this.eat(TOKEN_TYPES.less_equal_op)
            }
            else if(op.type === TOKEN_TYPES.less_op) {
                this.eat(TOKEN_TYPES.less_op)
            }
            else if(op.type === TOKEN_TYPES.equal_op) {
                this.eat(TOKEN_TYPES.equal_op)
            }
            node = new BinOpNode(node, op, this.parse_expr())
        }
        return node
    }
    private parse_expr(): TypedAstNode {
        let node = this.parse_term()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.plus_op ||
            this.current_token.type === TOKEN_TYPES.minus_op 
        ) {
            op = this.current_token;
            if(op.type === TOKEN_TYPES.plus_op) {
                this.eat(TOKEN_TYPES.plus_op)
            }
            else if(op.type === TOKEN_TYPES.minus_op) {
                this.eat(TOKEN_TYPES.minus_op)
            }
            node = new BinOpNode(node, op, this.parse_term())
        }
        return node
    }
    private parse_term(): TypedAstNode {
        let node = this.parse_factor()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.mul_op ||
            this.current_token.type === TOKEN_TYPES.div_op
        ) {
            op = this.current_token;
            if(op.type === TOKEN_TYPES.mul_op) {
                this.eat(TOKEN_TYPES.mul_op)
            }
            else if(op.type === TOKEN_TYPES.div_op) {
                this.eat(TOKEN_TYPES.div_op)
            }
            node = new BinOpNode(node, op, this.parse_factor())
        }
        return node
    }
    private parse_factor(): TypedAstNode {
        let node = null
        let cur_token = this.current_token;
        if(this.current_token.type === TOKEN_TYPES.number) {
            this.eat(TOKEN_TYPES.number)
            node = new LiteralNode(cur_token)
            // int case
            if (is_int(Number(node.token.value)) && !String(node.token.value).includes(".")) {
                node.type = new TypeNode(DATA_TYPES.int)
            }
            // float case
            else {          // if (is_float(Number(node.token.value))) {
                node.type = new TypeNode(DATA_TYPES.doub)
            }
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.string) {
            this.eat(TOKEN_TYPES.string)
            node = new LiteralNode(cur_token)
            node.type = new TypeNode(DATA_TYPES.str)
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.identifier) {
            let next_token = this.peek()
            if(next_token.type === TOKEN_TYPES.lpar) {
                node = this.parse_funccall()
            }
            else if (next_token.type === TOKEN_TYPES.lbracket) {
                node = this.parse_array_member()
            }
            else {
                this.eat(TOKEN_TYPES.identifier)
                node = new VarNode(cur_token.value)
            }
            return node
        }
        else if(this.current_token.type === TOKEN_TYPES.plus_op) {
            this.eat(TOKEN_TYPES.plus_op)
            node = new UnOpNode(cur_token, this.parse_factor())
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.minus_op) {
            this.eat(TOKEN_TYPES.minus_op)
            node = new UnOpNode(cur_token, this.parse_factor())
            return node
        }
        else if (this.current_token.type === TOKEN_TYPES.address_op) {
            this.eat(TOKEN_TYPES.address_op)
            node = new UnOpNode(cur_token, new VarNode(this.current_token.value))
            this.eat(TOKEN_TYPES.identifier)
            return node
        }
        else if (this.current_token.type === TOKEN_TYPES.mul_op) {
            this.eat(TOKEN_TYPES.mul_op)
            node = new UnOpNode(cur_token, new VarNode(this.current_token.value))
            this.eat(TOKEN_TYPES.identifier)
            return node
        }
        else if(this.current_token.type === TOKEN_TYPES.lpar) {
            this.eat(TOKEN_TYPES.lpar)
            node = this.parse_bin_expr();
            this.eat(TOKEN_TYPES.rpar)
            return node
        }
        else {
            LogManager.error(
                `Unexpected token ${this.current_token.type.name} in ${this.current_token.row}:${this.current_token.col}.`,
                 "Parser.ts")
            process.exit()
        }
    }
    parse(): AstNode {
        return this.parse_program()
    }
}
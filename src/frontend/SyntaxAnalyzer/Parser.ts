import { ProgramNode, AstStatementNode, BlockStmNode, AssignStmNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode, TypeNode } from './../AST/AST';
import { AstNode, BinOpNode, LiteralNode, UnOpNode } from "frontend/AST/AST"
import { Token, TokenType, TOKEN_TYPES } from './Tokens'
import { exit, LogManager } from 'utils';


export class Parser {
    private tokens: Token[]
    private current_token!: Token
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
            this.current_token.type === TOKEN_TYPES.new_line ||
            this.current_token.type === TOKEN_TYPES.tab
        ) {
            this.get_next_token()
        }
    }
    private eat(type: TokenType): void {
        if(type !== TOKEN_TYPES.new_line && type !== TOKEN_TYPES.tab) { 
            this.skip_gaps()
        }
        else if(type === TOKEN_TYPES.new_line) {
            while(this.current_token.type === TOKEN_TYPES.tab) {
                this.get_next_token()
            }
        }
        else if(type === TOKEN_TYPES.tab) {
            while(this.current_token.type === TOKEN_TYPES.new_line) {
                this.get_next_token()
            }
        }
        
        if(this.current_token.type.name === type.name) {
            this.get_next_token()
        }
        else {
            LogManager.error(
                `Unexpected token ${this.current_token.value} but required ${type.name} token type in ${this.current_token.row}:${this.current_token.col}.`,
                "Parser.ts"
            )
        }
    }
    private peek(): Token {
        return this.tokens[0]
    }
    private parse_program(): ProgramNode {
        let statements: AstStatementNode[] = []
        while(true) {
            let stm = this.parse_stm()
            statements.push(stm)
            if (stm instanceof EOFStmNode) break
            if(this.current_token.type !== TOKEN_TYPES.EOF) {
                this.eat(TOKEN_TYPES.new_line)
            }
        }
        return new ProgramNode(new BlockStmNode(statements))
    }
    private parse_block_stm(): BlockStmNode {
        this.eat(TOKEN_TYPES.block_start)
        this.eat(TOKEN_TYPES.new_line)
        let statements: AstStatementNode[] = []
        while(this.current_token.type === TOKEN_TYPES.tab) {
            this.eat(TOKEN_TYPES.tab)
            let stm = this.parse_stm()
            statements.push(stm)
            this.eat(TOKEN_TYPES.new_line)
        }
        return new BlockStmNode(statements)
    }
    private parse_stm(): AstStatementNode {
        this.skip_gaps()
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
            // assignment case
            else {
                return this.parse_assignment()
            }
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
        let value = this.parse_expr()
        return new AssignStmNode(name, value)
    }
    private parse_vardecl(): VarDeclStmNode {
        let name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        this.eat(TOKEN_TYPES.type_mark)
        let type_name = this.current_token.value
        this.eat(TOKEN_TYPES.identifier)
        this.eat(TOKEN_TYPES.assign_op)
        return new VarDeclStmNode(name, new TypeNode(type_name), this.parse_expr())
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
            args.push(this.parse_expr())
        }
        this.eat(TOKEN_TYPES.rpar)
        return args
    }
    private parse_shared_import(): SharedImpStmNode {
        this.eat(TOKEN_TYPES.shared_import_key)
        let dist = this.parse_factor()
        return new SharedImpStmNode(dist)
    }
    private parse_expr(): AstNode {
        let node = this.parse_term()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.plus_op ||
            this.current_token.type === TOKEN_TYPES.minus_op
        ) {
            op = this.current_token;
            if(this.current_token.type === TOKEN_TYPES.plus_op) {
                this.eat(TOKEN_TYPES.plus_op)
            }
            else {
                this.eat(TOKEN_TYPES.minus_op)
            }
            node = new BinOpNode(node, op, this.parse_term())
        }
        return node
    }
    private parse_term(): AstNode {
        let node = this.parse_factor()
        let op = null
        while(
            this.current_token.type === TOKEN_TYPES.mul_op ||
            this.current_token.type === TOKEN_TYPES.div_op
        ) {
            op = this.current_token;
            if(this.current_token.type === TOKEN_TYPES.mul_op) {
                this.eat(TOKEN_TYPES.mul_op)
            }
            else {
                this.eat(TOKEN_TYPES.div_op)
            }
            node = new BinOpNode(node, op, this.parse_factor())
        }
        return node
    }
    private parse_factor(): AstNode {
        let node = null
        let cur_token = this.current_token;
        if(this.current_token.type === TOKEN_TYPES.number) {
            this.eat(TOKEN_TYPES.number)
            node = new LiteralNode(cur_token)
            return node 
        }
        if(this.current_token.type === TOKEN_TYPES.string) {
            this.eat(TOKEN_TYPES.string)
            node = new LiteralNode(cur_token)
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.identifier) {
            let next_token = this.peek()
            if(next_token.type === TOKEN_TYPES.lpar) {
                node = this.parse_funccall()
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
        else if(this.current_token.type === TOKEN_TYPES.lpar) {
            this.eat(TOKEN_TYPES.lpar)
            node = this.parse_expr();
            this.eat(TOKEN_TYPES.rpar)
            return node
        }
        else {
            LogManager.error(
                `Unexpectod token in ${this.current_token.row}:${this.current_token.col}.`,
                 "Parser.ts")
            process.exit()
        }
    }
    parse(): AstNode {
        return this.parse_program()
    }
}
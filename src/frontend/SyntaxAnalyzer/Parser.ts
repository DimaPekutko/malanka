import { AstNode, BinOpNode, NumLiteralNode, UnOpNode } from "frontend/AST/AST"
import { Token, TokenType, TOKEN_TYPES } from './Tokens'


export class Parser {
    private tokens: Token[]
    private current_token!: Token
    constructor(tokens: Token[]) {
        this.tokens = tokens
        this.get_next_token()
        this.skip_new_lines()
    }
    private get_next_token(): Token {
        this.current_token = this.tokens.shift()!        
        return this.current_token
    }
    private skip_new_lines(): void {
        if(this.current_token?.type === TOKEN_TYPES.new_line) 
        {
            while(this.current_token?.type === TOKEN_TYPES.new_line) {
                this.get_next_token()
            }
        }
    }
    private eat(type: TokenType): void {
        if(type !== TOKEN_TYPES.new_line) 
            this.skip_new_lines();

        if(this.current_token?.type.name === type.name) {
            this.get_next_token()
        }
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
            node = new NumLiteralNode(cur_token)
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
            // error
            throw new Error("Undefined factor.");
        }
    }
    parse(): AstNode {
        return this.parse_expr();
    }
}
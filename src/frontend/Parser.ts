import { ErrorManager } from '../utils/ErrorManager';
import { AstNode, BinOpNode, NumLiteralNode, UnOpNode } from './AST';
import { Token, TokenType, TOKEN_TYPES } from './Tokens';


export class Parser {
    private tokens: Token[]
    private current_token!: Token
    constructor(tokens: Token[]) {
        this.tokens = tokens
    }
    private get_next_token(): Token {
        this.current_token = this.tokens.shift()!        
        return this.current_token
    }
    private eat(type: TokenType) {
        // skip new lines
        if(this.current_token?.type === TOKEN_TYPES.new_line &&
            this.current_token.type!== type) 
        {
            while(this.current_token?.type === TOKEN_TYPES.new_line) {
                this.get_next_token()
            }
        }

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
        if(this.current_token.type === TOKEN_TYPES.number) {
            node = new NumLiteralNode(this.current_token)
            this.eat(TOKEN_TYPES.number)
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.plus_op) {
            node = new UnOpNode(this.current_token, this.parse_factor())
            this.eat(TOKEN_TYPES.plus_op)
            return node 
        }
        else if(this.current_token.type === TOKEN_TYPES.minus_op) {
            node = new UnOpNode(this.current_token, this.parse_factor())
            this.eat(TOKEN_TYPES.minus_op)
            return node 
        }
        else {
            // error
            process.exit()
        }
    }
    parse(): void {
        this.get_next_token()
    }
}
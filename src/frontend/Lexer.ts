import { Token, TOKEN_TYPES } from './Tokens';

export class Lexer {
    readonly code: string
    readonly TAB_SIZE = 3
    tokens: Token[] = []
    row: number = 0
    col: number = 0
    pos: number = 0
    constructor(code: string) {
        this.code = code
    }
    tokenize(): Token[] {
        while(this.pos !== this.code.length) {
            this.parse_token()
        }
        this.replace_spaces_with_tabs()
        this.tokens.push(new Token(TOKEN_TYPES.EOF,"EOF",this.row,this.col))
        return this.tokens.filter(token => token.type.name !== TOKEN_TYPES.space.name);
    }
    private replace_spaces_with_tabs(): void {
        let space_cnt = 0
        for(let i = 0; i < this.tokens.length; i++) {
            if(this.tokens[i].type.name === TOKEN_TYPES.space.name) {
                space_cnt++
            }
            else {
                space_cnt = 0;
            }
            if(space_cnt === this.TAB_SIZE) {
                let tab_token = 
                    new Token(TOKEN_TYPES.tab, "\t", this.tokens[i].row, this.tokens[i].col)
                this.tokens.splice(i+1-this.TAB_SIZE, i+1, tab_token)
                i -= this.TAB_SIZE
                space_cnt = 0
            }
        }
    }
    private parse_token(): void {
        let token_types = Object.entries(TOKEN_TYPES)
        for(let i = 0; i < token_types.length; i++) {
            let regex = new RegExp(token_types[i][1].regex)
            let match = this.code.substring(this.pos).match(regex)
            if(match !== null) {
                if(match.index === 0) {
                    this.tokens.push(new Token(token_types[i][1],match[0],this.row,this.col))
                    this.pos += match[0].length
                    this.col += match[0].length
                    if(token_types[i][1] === TOKEN_TYPES.new_line) {
                        this.col = 1
                        this.row++;
                    }
                    return
                }
            }
        }
    }   

}
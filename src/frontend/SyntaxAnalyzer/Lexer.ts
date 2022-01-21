import { dump, exit } from './../../utils';
import { Token, TOKEN_TYPES } from './Tokens';

export class Lexer {
    readonly code: string
    readonly TAB_SIZE = 4
    tokens: Token[] = []
    row: number = 1
    col: number = 1
    pos: number = 0
    constructor(code: string) {
        this.code = code
    }
    tokenize(): Token[] {
        while(this.pos < this.code.length) {
            // console.log(this.pos, this.code.length)
            this.parse_token()
        }
        this.replace_spaces_with_tabs()
        this.tokens.push(new Token(TOKEN_TYPES.EOF,"EOF",this.row,this.col))
        return this.tokens.filter(token => token.type.name !== TOKEN_TYPES.space.name);
    }
    private replace_spaces_with_tabs(): void {
        let updated_tokens: Token[] = []
        let space_cnt: number = 0
        for(let i = 0; i < this.tokens.length; i++) {
            this.tokens[i].type === TOKEN_TYPES.space ? space_cnt++ : space_cnt = 0
            if (space_cnt === this.TAB_SIZE) {
                while (space_cnt !== 1) {
                    updated_tokens.pop()
                    space_cnt--
                }
                updated_tokens.push(
                    new Token(TOKEN_TYPES.tab,"\t",this.tokens[i].row,this.tokens[i].col+1-this.TAB_SIZE))
                space_cnt = 0
                continue
            }
            updated_tokens.push(this.tokens[i])
        }
        this.tokens = updated_tokens
    }
    private parse_token(): void {
        let token_types = Object.entries(TOKEN_TYPES)
        for(let i = 0; i < token_types.length; i++) {
            let regex = new RegExp(token_types[i][1].regex)
            let match = this.code.substring(this.pos).match(regex)
            if(match !== null && match.index === 0 && match[0].length > 0) {
                this.pos += match[0].length
                this.col += match[0].length                  
                // just token
                if(token_types[i][1] !== TOKEN_TYPES.string_quote) {
                    this.tokens.push(new Token(token_types[i][1],match[0],this.row,this.col))
                    if(token_types[i][1] === TOKEN_TYPES.new_line) {
                        this.col = 1
                        this.row++
                    }
                }
                // string case
                else {
                    let str_row = this.row
                    let str_col = this.col
                    let str_value = ""
                    let char = ""
                    match = this.code[this.pos].match(regex)
                    while (match === null) {
                        str_value += char
                        char = this.code[this.pos]
                        this.pos++
                        this.col++
                        match = char.match(regex)
                    }

                    this.tokens.push(new Token(TOKEN_TYPES.string, str_value, str_row, str_col))
                }
                return
            }
        }
        throw new Error("Undefined token in lexer")
    }   

}
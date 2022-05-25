export class TokenType {
    readonly name: string
    readonly regex: string
    constructor(name: string, regex: string) {
        this.name = name
        this.regex = regex
    }
}

export class Token {
    readonly type: TokenType
    readonly row: number 
    readonly col: number
    value: any
    constructor(type: TokenType, value: any, row: number, col: number) {
        this.type = type;
        this.value = value;
        this.row = row;
        this.col = col;
    }
}

export abstract class TOKEN_TYPES {
    // empty
    static "new_line" = new TokenType("new_line","\n")
    static "tab" = new TokenType("tab","\t")
    static "space" = new TokenType("space"," ")
    static "lpar" = new TokenType("lpar", "\\(")
    static "rpar" = new TokenType("rpar", "\\)")
    static "lbracket" = new TokenType("lbracket", "\\[")
    static "rbracket" = new TokenType("rbracket", "\\]")
    static "lbrace" = new TokenType("lbrace", "\\{")
    static "rbrace" = new TokenType("rbrace", "\\}")
    static "comma" = new TokenType("comma", "\\,")
    static "semicolon" = new TokenType("semicolon", "\\;")
    static "comment" = new TokenType("comment", "\\//")
    // operations
    static "and_op" = new TokenType("and_op", "\\and")    
    static "or_op" = new TokenType("or_op", "\\or")
    static "equal_op" = new TokenType("equal_op", "\\==")
    static "greater_equal_op" = new TokenType("greater_equal_op", "\\>=")
    static "greater_op" = new TokenType("greater_op", "\\>")
    static "less_equal_op" = new TokenType("less_equal_op", "\\<=")
    static "less_op" = new TokenType("less_op", "\\<")
    static "plus_op" = new TokenType("plus_op", "\\+")
    static "minus_op" = new TokenType("minus_op", "\\-")
    static "mul_op" = new TokenType("mul_op", "\\*")
    static "div_op" = new TokenType("div_op", "\\/")
    static "assign_op" = new TokenType("assign_op", "\\=")
    static "address_op" = new TokenType("address_op", "\\&")
    // marks
    static "block_start" = new TokenType("block_start", "\\:")
    static "func_decl_mark" = new TokenType("func_decl_mark", "\\.")
    static "params_mark" = new TokenType("params_mark", "\\#")
    static "type_mark" = new TokenType("type_mark", "\\@")
    static "return_mark" = new TokenType("return_mark", "\\!")
    // conditions
    static "if" = new TokenType("if", "if")
    static "elif" = new TokenType("elif", "elif")
    static "else" = new TokenType("else", "else")
    // loops
    static "for" = new TokenType("for", "for")
    // imports
    static "shared_import_key" = new TokenType("shared_import_key", "dlib")
    // general
    static "end_key" = new TokenType("end_key", "\\end")
    static "number" = new TokenType("number","([0-9]*[.])?[0-9]+")
    static "identifier" = new TokenType("identifier", "([A-Za-z0-9\_]+)")
    // static "type_identifier" = new TokenType("type_identifier", "@([A-Za-z0-9\_]+)")
    // strings
    static "string_quote" = new TokenType("string_quote", '\\"')
    static "string" = new TokenType("string", "")
    // end of file
    static "EOF" = new TokenType("EOF", "")
}
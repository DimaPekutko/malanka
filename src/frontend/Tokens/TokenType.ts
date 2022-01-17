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

export abstract class TokenTypesTable {
    // empty
    static "new_line" = new TokenType("new_line","\n")
    static "tab" = new TokenType("tab","\t")
    static "space" = new TokenType("space"," ")
    // operations
    static "plus_op" = new TokenType("plus_op", "\\+")
    static "minus_op" = new TokenType("minus_op", "\\-")
    static "mul_op" = new TokenType("mul_op", "\\*")
    static "div_op" = new TokenType("div_op", "\\/")
    // marks
    static "func_decl_mark" = new TokenType("func_decl_mark", "\\.")
    static "func_params_mark" = new TokenType("func_params_mark", "\\#")
    static "type_mark" = new TokenType("type_mark", "\\@")
    // general
    static "number" = new TokenType("number","([0-9]*[.])?[0-9]+")
    static "identifier" = new TokenType("identifier", "[a-z]*")
}

// export default {
//     "variable_key": new Token_Type("variable_key", "val"),
//     "function_key": new Token_Type("function_key", "def"),

//     "assignment": new Token_Type("assignment", "="),
//     "com": new Token_Type("com", ","),

//     "space": new Token_Type("space", "\\s"),
//     "semicolon": new Token_Type("semicolon", "\\;"),
//     "lpar": new Token_Type("lpar", "\\("),
//     "rpar": new Token_Type("rpar", "\\)"),
//     "lbrace": new Token_Type("lbrace", "\\{"),
//     "rbrace": new Token_Type("rbrace", "\\}"),

//     "plus_op": new Token_Type("plus_op", "\\+"),
//     "minus_op": new Token_Type("minus_op", "\\-"),
//     "mult_op": new Token_Type("mult_op", "\\*"),
//     "div_op": new Token_Type("div_op", "\\/"),

//     "int_type": new Token_Type("int_type", "@int"),
//     "float_type": new Token_Type("float_type", "@float"),
//     "string_type": new Token_Type("string_type", "@string"),

//     "float_number": new Token_Type("float_number", "([0-9]*[.])?[0-9]+"),
//     "number": new Token_Type("number", "\\d+"),
//     "identifier": new Token_Type("identifier", "[a-z]*"),

//     "EOF": new Token_Type("EOF",""),
// }
import { Token } from 'frontend/SyntaxAnalyzer/Tokens';

export abstract class AstNode {
    token!: Token
}

export abstract class AstStatementNode extends AstNode {}

export class BlockStmNode extends AstStatementNode {
    children: AstStatementNode[]
    constructor(children: AstStatementNode[]) {
        super()
        this.children = children
    }
}

export class ProgramNode extends AstNode {
    body: BlockStmNode
    constructor(body: BlockStmNode) {
        super()
        this.body = body
    }
}
export class TypeNode extends AstNode {
    constructor(token: Token) {
        super()
        this.token = token
    }
}

export class AssignStmNode extends AstStatementNode {
    name: string
    value: any
    constructor(name: string, value: any) {
        super()
        this.name = name
        this.value = value
    } 
}

export class LiteralNode extends AstNode {
    constructor(token: Token) {
        super()
        this.token = token
    }
}

export class VarDeclStmNode extends AstStatementNode {
    var_name: string
    type: TypeNode
    init_value: AstNode
    constructor(var_name: string, type: TypeNode, init_value: any) {
        super()
        this.var_name = var_name
        this.type = type
        this.init_value = init_value
    }
}

export class VarNode extends AstNode {
    name: string
    constructor(name: string) {
        super()
        this.name = name
    }
}

export class BinOpNode extends AstNode {
    left: AstNode
    right: AstNode
    constructor(left: AstNode, op: Token, right: AstNode) {
        super()
        this.left = left
        this.token = op
        this.right = right
    }
}

export class UnOpNode extends AstNode {
    left: AstNode
    constructor(op: Token, left: AstNode) {
        super()
        this.left = left
        this.token = op
    }
}

export class FuncCallStmNode extends AstStatementNode {
    func_name: string
    args: AstNode[]
    constructor(func_name: string, args: AstNode[]) {
        super()
        this.func_name = func_name
        this.args = args
    }
}

export class SharedImpStmNode extends AstStatementNode {
    str: LiteralNode
    constructor(str: LiteralNode) {
        super()
        this.str = str
    }
}

export class EOFStmNode extends AstStatementNode {
    constructor() {
        super()
    }
}
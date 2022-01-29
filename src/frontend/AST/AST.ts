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
    name: string
    constructor(name: string) {
        super()
        this.name = name
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
    type!: TypeNode  // should be specifyed in semantic analyzer
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

export class IfStmNode extends AstStatementNode {
    condition: AstNode | null
    body: BlockStmNode
    alternate!: IfStmNode
    constructor(condition: AstNode | null, body: BlockStmNode) {
        super()
        this.condition = condition
        this.body = body
    }
}

export class ForStmNode extends AstStatementNode {
    init_stm: VarDeclStmNode
    condition: AstNode
    update_stm: AstStatementNode
    body: BlockStmNode
    constructor(init_stm: VarDeclStmNode, condition: AstNode, update_stm: AstStatementNode, body: BlockStmNode) {
        super()
        this.init_stm = init_stm
        this.condition = condition
        this.update_stm = update_stm
        this.body = body
    }
}

export class ParamNode extends AstNode {
    name: string
    type: TypeNode
    constructor(name: string, type: TypeNode) {
        super()
        this.name = name
        this.type = type
    }
}

export class FuncDeclStmNode extends AstStatementNode {
    func_name: string
    ret_type: TypeNode
    params: ParamNode[]
    body: BlockStmNode
    constructor(func_name: string, ret_type: TypeNode, params: ParamNode[], body: BlockStmNode) {
        super()
        this.func_name = func_name
        this.ret_type = ret_type
        this.params = params
        this.body = body
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
    str: string
    constructor(str: string) {
        super()
        this.str = str
    }
}

export class EOFStmNode extends AstStatementNode {
    constructor() {
        super()
    }
}
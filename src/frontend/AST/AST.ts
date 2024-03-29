import { uid } from './../../utils';
import { Token } from './../../frontend/SyntaxAnalyzer/Tokens';

export abstract class AstNode {
    token!: Token
}

export abstract class AstStatementNode extends AstNode { }

export class BlockStmNode extends AstStatementNode {
    children: AstStatementNode[]
    uid: string // this need to identify symbol table for this block scope in symbol manager
    constructor(children: AstStatementNode[]) {
        super()
        this.children = children
        this.uid = uid(32)
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
    points_to_type!: string
    constructor(name: string) {
        super()
        this.name = name
    }
}

export class AssignStmNode extends AstStatementNode {
    name: string
    type!: TypeNode
    value: any
    constructor(name: string, value: any) {
        super()
        this.name = name
        this.value = value
    }
}


export abstract class TypedAstNode extends AstNode {
    type!: TypeNode  // should be specifyed in semantic analyzer
}

export class LiteralNode extends TypedAstNode {
    constructor(token: Token) {
        super()
        this.token = token
    }
}
export class VarNode extends TypedAstNode {
    name: string
    constructor(name: string) {
        super()
        this.name = name
    }
}

export class BinOpNode extends TypedAstNode {
    left: AstNode
    right: AstNode
    constructor(left: AstNode, op: Token, right: AstNode) {
        super()
        this.left = left
        this.token = op
        this.right = right
    }
}

export class UnOpNode extends TypedAstNode {
    left: AstNode
    constructor(op: Token, left: AstNode) {
        super()
        this.left = left
        this.token = op
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


export class ArrayDeclStmNode extends AstStatementNode {
    array_name: string
    array_type: TypeNode
    size: number[]
    init_value: ArrayExprNode
    constructor(name: string, type: TypeNode, size: number[], init_value: ArrayExprNode) {
        super()
        this.array_name = name
        this.array_type = type
        this.size = size
        this.init_value = init_value
    }
}

export class ArrayExprNode extends TypedAstNode {
    members: TypedAstNode[]
    arr_name: string
    size: number[]
    depth: number
    constructor(members: TypedAstNode[], arr_name: string, size: number[], depth: number) {
        super()
        this.members = members
        this.arr_name = arr_name
        this.size = size
        this.depth = depth
    }
}

export class ArrayMemberNode extends TypedAstNode {
    array_name: string
    index: TypedAstNode[]
    constructor(name: string, index: TypedAstNode[]) {
        super()
        this.array_name = name
        this.index = index
    }
}

export class ArrayMemberAssignStmNode extends AstStatementNode {
    arr_member: ArrayMemberNode
    value: TypedAstNode
    constructor(arr_member: ArrayMemberNode, value: TypedAstNode) {
        super()
        this.arr_member = arr_member
        this.value = value
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

export class ReturnStmNode extends TypedAstNode {
    expr: AstNode
    constructor(expr: AstNode) {
        super()
        this.expr = expr
    }
}

export class FuncCallStmNode extends TypedAstNode {
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
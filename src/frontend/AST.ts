import { Token } from './Tokens';

export abstract class AstNode {
    token!: Token
}

export class AstNodeStatement extends AstNode {

}

export class TypeNode extends AstNode {}

export class NumLiteralNode extends AstNode {
    constructor(token: Token) {
        super();
        this.token = token;
    }
}

export class BinOpNode extends AstNode {
    left: AstNode
    right: AstNode
    constructor(left: AstNode, op: Token, right: AstNode) {
        super();
        this.left = left;
        this.token = op
        this.right = right;
    }
}

export class UnOpNode extends AstNode {
    right: AstNode
    constructor(op: Token, right: AstNode) {
        super();
        this.right = right;
        this.token = op;
    }
}
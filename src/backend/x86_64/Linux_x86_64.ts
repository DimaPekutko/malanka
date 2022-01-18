import { BinOpNode, UnOpNode, NumLiteralNode, AstNode } from "frontend/AST/AST";
import { INodeVisitor } from "frontend/AST/INodeVisitor";
import { TOKEN_TYPES } from "frontend/SyntaxAnalyzer/Tokens";

import { writeFileSync } from "fs"
import { execSync } from "child_process"
import path from "path"

class NasmWriter {
    private _data: string = `segment .data`
    private _bss: string = `segment .bss`
    private _text: string = `segment .text\nglobal _start\n_start:`
    data(source: string): void {
        this._data += ("\n\t"+source)
    }
    bss(source: string): void {
        this._bss += ("\n\t"+source)
    }
    text(source: string): void {
        this._text += ("\n\t"+source)
    }
    get_source(): string {
        return this._data+"\n"+this._bss+"\n"+this._text
    }
}

export class Linux_x86_64 implements INodeVisitor {
    ast: AstNode
    output_filename: string
    nasm: NasmWriter
    constructor(ast: AstNode, output_filename: string) {
        this.ast = ast
        this.output_filename = path.join(output_filename)
        this.nasm = new NasmWriter();
    }
    visit_BinOpNode(node: BinOpNode): void {
        this.visit(node.left)
        this.visit(node.right)
        if (node.token.type === TOKEN_TYPES.plus_op) {
            this.nasm.text(`pop rax`)
            this.nasm.text(`pop rbx`)
            this.nasm.text(`add rax, rbx`)
            this.nasm.text(`push rax`)
        }
        else if (node.token.type === TOKEN_TYPES.minus_op) {
            this.nasm.text(`pop rax`)
            this.nasm.text(`pop rbx`)
            this.nasm.text(`sub rax, rbx`)
            this.nasm.text(`push rax`)
        }
    }
    visit_UnOpNode(node: UnOpNode): void {
        throw new Error("Method not implemented.");
    }
    visit_NumLiteralNode(node: NumLiteralNode): void {
        let num = node.token.value
        this.nasm.text(`push ${num}`)
    }
    visit(node: AstNode): any {
        // It's dirty, but there are no need to write a complex if else
        let visit_method = "this.visit_"+node.constructor.name+"(node)"
        return eval(visit_method)
    }
    visit_exit(): void {
        this.nasm.text("; exit")
        this.nasm.text("mov rax, 60")
        this.nasm.text("xor rdi, rdi")
        this.nasm.text("syscall")
    }
    compile(): void {
        this.visit(this.ast)
        this.visit_exit()
        
        writeFileSync(this.output_filename+".asm", this.nasm.get_source())
        execSync(`nasm -f elf64 ${this.output_filename}.asm `)
        execSync(`ld ${this.output_filename}.o`)
        execSync(`./a.out`)
    }
    
}
import { LogManager, uid } from './../../utils';
import { SymbolManager } from 'frontend/SymbolManager';
import { writeFileSync } from "fs"
import { execSync } from "child_process"
import path from "path"

import { BinOpNode, UnOpNode, LiteralNode, AstNode, AssignStmNode, BlockStmNode, ProgramNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode } from "frontend/AST/AST";
import { INodeVisitor } from "frontend/AST/INodeVisitor";
import { TOKEN_TYPES } from "frontend/SyntaxAnalyzer/Tokens";

// import { } from ""


class NasmWriter {
    private _extern: string = ``
    private _text: string = `segment .text\nglobal _start\n_start:`
    private _bss: string = `segment .bss`
    private _data: string = `segment .data`
    extern(source: string): void {
        this._extern += ("\n\t"+source)
    }
    text(source: string): void {
        this._text += ("\n\t"+source)
    }
    bss(source: string): void {
        this._bss += ("\n\t"+source)
    }
    data(source: string): void {
        this._data += ("\n\t"+source)
    }
    get_source(): string {
        return this._extern+"\n"+this._text+"\n"+this._bss+"\n"+this._data
    }
}

export class Linux_x86_64 implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    output_filename: string
    nasm: NasmWriter
    constructor(ast: AstNode, symbol_manager: SymbolManager, output_filename: string) {
        this.ast = ast
        this.symbol_manager = symbol_manager
        this.output_filename = path.join(output_filename)
        this.nasm = new NasmWriter();
    }
    fill_extern_symbols(): void {
        let global_symbols = this.symbol_manager.GLOBAL_SCOPE.symbols
        global_symbols.forEach(symbol => {
            if (symbol.IS_EXTERNAL) {
                this.nasm.extern(`extern ${symbol.name}`)
            }
        })
    }
    fill_system_constants(): void {
        this.nasm.data("TRUE equ 1")
        this.nasm.data("FALSE equ 0")
    }
    visit_ProgramNode(node: ProgramNode): void {
        this.fill_extern_symbols()
        this.fill_system_constants()
        this.visit(node.body)
    }
    visit_BlockStmNode(node: BlockStmNode): void {
        node.children.forEach(stm => {
            this.visit(stm)
        })
    }
    visit_AssignStmNode(node: AssignStmNode): void {
        let var_name: string = node.name
        this.visit(node.value)
        this.nasm.text(`mov [${var_name}], rax`)
    }
    visit_BinOpNode(node: BinOpNode): void {
        this.nasm.text(`; arithmetic op`)
        this.visit(node.left)   // generate 'mov rax, l_operand'
        this.nasm.text(`push rax`)
        this.visit(node.right)  // generate 'mov rax, r_operand'
        this.nasm.text(`mov rbx, rax`)
        this.nasm.text(`pop rax`)
        if (node.token.type === TOKEN_TYPES.plus_op) {
            this.nasm.text(`add rax, rbx`)
        }
        else if (node.token.type === TOKEN_TYPES.minus_op) {
            this.nasm.text(`sub rax, rbx`)
        }
        else if (node.token.type === TOKEN_TYPES.mul_op) {
            this.nasm.text(`imul rbx`)
        }
        else if (node.token.type === TOKEN_TYPES.div_op) {
            this.nasm.text(`idiv rbx`)
            // this.nasm.text(`mov rax, rdx`)
        }
    }
    visit_UnOpNode(node: UnOpNode): void {
        this.visit(node.left)
        if (node.token.type === TOKEN_TYPES.minus_op) {
            this.nasm.text("not rax")
            this.nasm.text("inc rax")
        }
    }
    visit_LiteralNode(node: LiteralNode): void {
        let value = node.token.value
        // for number 
        if(!isNaN(parseFloat(value))) {
            this.nasm.text(`mov rax, ${value}`)
        }
        else {
            let str_name = 
                "str_"+uid(10)
            this.nasm.data(`${str_name} db "${value}",0xa,0`)
            this.nasm.text(`mov rax, ${str_name}`)
        }
    }
    visit_VarDeclStmNode(node: VarDeclStmNode): void {
        let var_name: string = node.var_name
        this.visit(node.init_value)
        this.nasm.bss(`${var_name} resb 8`)
        this.nasm.text(`mov [${var_name}], rax`)
    }
    visit_VarNode(node: VarNode): void {
        let name = node.name
        // this.nasm.text(`; push var to stack`)
        this.nasm.text(`mov rax, [${name}]`)
    }
    visit_FuncCallStmNode(node: FuncCallStmNode): void {
        const func_name = node.func_name
        const args = node.args
        
        const arg_registers = [
            "rdi","rsi","rdx","rcx","r8","r9"
        ]

        const defined_func = this.symbol_manager.GLOBAL_SCOPE.get(func_name)

        if (defined_func === undefined) {
            throw new Error ("Function dont exist")
        }

        if(args.length <= arg_registers.length) {
            this.nasm.text(`; ------ funccall -> ${func_name}`)
            // saving current arg registers
            for(let i = 0; i < arg_registers.length; i++) {
                this.nasm.text(`push ${arg_registers[i]}`)
            }
            // filling new arg registers
            for (let i = 0; i < args.length; i++) {
                this.visit(args[i])
                this.nasm.text(`mov ${arg_registers[i]}, rax`)
            }
            // calling current function
            this.nasm.text(`call ${func_name}`)
            // pop up old arg registers
            for(let i = arg_registers.length-1; i >= 0; i--) {
                this.nasm.text(`pop ${arg_registers[i]}`)
            }
            this.nasm.text(`; ------ funccall end -> ${func_name}`)
        }
        else {
            throw new Error("Arguments count > 6")
        }

    }
    visit_SharedImpStmNode(node: SharedImpStmNode): void {
        
    }
    visit_EOFStmNode(node: EOFStmNode): void {
        // console.log("hello")
        this.nasm.text("; exit")
        this.nasm.text("mov rax, 60")
        this.nasm.text("xor rdi, rdi")
        this.nasm.text("syscall")
    }
    visit(node: AstNode): any {
        // It's dirty, but there are no need to write a complex if else structure
        let visit_method = "this.visit_"+node.constructor.name+"(node)"
        return eval(visit_method)
    }
    compile(): void {
        this.visit(this.ast)
        // console.log(Buffer.from(execSync("ls")).toString())
        writeFileSync(this.output_filename+".asm", this.nasm.get_source())
        
        this.compile_nasm()
        this.link_obj()

        LogManager.success(`Run by: ${"./"+this.output_filename}.`, "Linux_x86_64.ts")
        // this.run_binary()
    }
    private compile_nasm(): void {
        try {
            execSync(`nasm -f elf64 ${this.output_filename}.asm `)
            LogManager.log("Compiled successfully.", "Linux_x86_64.ts")
        } catch (err) {
            LogManager.error("Compilation failed.", "Linux_x86_64.ts")
        }
    }
    private link_obj(): void {
        let cmd = `ld `
        let linker_path = ``
        if (this.symbol_manager.shared_libs_list.length > 0) {
            cmd += `-lc -dynamic-linker `
            linker_path = this.find_ld_linker_path()
            cmd += (linker_path+" ")
            // this.symbol_manager.shared_libs_list.forEach(lib_path => {
            //     cmd += (lib_path+" ")
            // })
        }
        cmd += `${this.output_filename}.o -o ${this.output_filename}`
        cmd = cmd.replace(/(\r\n|\n|\r)/gm, "");
        try {
            execSync(cmd)
            LogManager.log("Linked successfully.", "Linux_x86_64.ts")
        }
        catch (err) {
            LogManager.error("Linking failed.", "Linux_x86_64.ts")
        }
    }
    private run_binary(): void {
        execSync(`./${this.output_filename}`)
    }
    private find_ld_linker_path(): string {
        let output = execSync("ls /lib64 | grep ld-linux-x86-64.so")
        let linker_path: string = "/lib64/"+Buffer.from(output).toString()
        return linker_path
    }
    
}
import { TokenType } from './../../frontend/SyntaxAnalyzer/Tokens';
import { DATA_TYPES } from 'frontend/DataTypes';
import { ScopeTypes, SymbolTable } from 'frontend/SymbolManager';
import { SharedLibManager, LogManager, uid, dump, exit } from './../../utils';
import { SymbolManager } from 'frontend/SymbolManager';
import * as SYSTEM_SYMBOLS from "frontend/SystemSymbols"
import { writeFileSync } from "fs"
import { execSync } from "child_process"
import path from "path"

import { BinOpNode, UnOpNode, LiteralNode, AstNode, AssignStmNode, BlockStmNode, ProgramNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode, IfStmNode, ForStmNode, FuncDeclStmNode, AstStatementNode, ReturnStmNode, TypedAstNode } from "frontend/AST/AST";
import { INodeVisitor } from "frontend/AST/INodeVisitor";
import { TOKEN_TYPES } from "frontend/SyntaxAnalyzer/Tokens";


const NASM_BOOTSTRAP_NAME = "/bootstrap"
const NASM_BOOTSTRAP_PATH = path.join(__dirname+NASM_BOOTSTRAP_NAME)
const OUTPUT_DIR = "./tmp"

class NasmWriter {
    private _extern: string = ``
    private _text: string = `segment .text\nglobal _start\n_start:`
    private _bss: string = `segment .bss`
    private _data: string = `segment .data`
    private _label_counter: number = 0
    buffer_label: string = ""    
    extern(source: string): void {
        this._extern += ("\n\t"+source)
    }
    text(source: string): void {
        this._text += ("\n\t"+source)
    }
    gen_label(label: string): string {
        let new_label = (label +"__"+ uid(5) +"___" + this._label_counter)
        this._label_counter++
        return new_label
    }
    add_label (label: string): void {
        this._text += ("\n"+label+":")
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

class StackFrameManager {
    readonly BUFFER_MEM_NAME: string
    private symbols: Map<string, number> 
    private local_var_offset: number
    constructor() {
        this.symbols = new Map()
        this.local_var_offset = 0
        this.BUFFER_MEM_NAME = "buffer_"+uid(5)
    }
    add_var(name: string, size: number = 8): number {
        this.local_var_offset += size
        this.symbols.set(name, this.local_var_offset)
        return this.local_var_offset
    }
    get_var_offset(name: string): number {
        return this.symbols.get(name)!
    }
    clear(): void {
        this.symbols.clear()
        this.local_var_offset = 0
    }
}

export class Linux_x86_64 implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    output_filename: string
    stack_frame_manager: StackFrameManager
    nasm: NasmWriter
    current_scope: SymbolTable | null = null
    constructor(ast: AstNode, symbol_manager: SymbolManager, output_filename: string) {
        this.ast = ast
        this.symbol_manager = symbol_manager
        this.output_filename = path.join(output_filename)
        this.stack_frame_manager = new StackFrameManager()
        this.nasm = new NasmWriter();
    }
    fill_extern_symbols(): void {
        this.current_scope?.symbols.forEach(symbol => {
            if (symbol.IS_EXTERNAL) {
                this.nasm.extern(`extern ${symbol.name}`)
            }
        })
        this.nasm.extern(`extern __bootstrap`)
    }
    fill_system_symbols(): void {
        this.nasm.data(`${this.stack_frame_manager.BUFFER_MEM_NAME} dq 0`)
        let system_symbols = Object.entries(SYSTEM_SYMBOLS)
        system_symbols.forEach(symbol => {
            this.nasm.extern(`extern ${symbol[0]}`)
        })
    }
    load_bootsrap_nasm(): void {
        this.nasm.text(`call __bootstrap`)
    }
    visit_ProgramNode(node: ProgramNode): void {
        // settting up func decl statements at the end of array
        // this need to write nasm procedures code after exit syscall instruction only
        node.body.children.sort((stm1: AstStatementNode, stm2: AstStatementNode): any => {
            let func_decl1 = stm1 instanceof FuncDeclStmNode
            let func_decl2 = stm2 instanceof FuncDeclStmNode
            
            if (func_decl1 && !func_decl2) {
                return 1
            }
            else if (!func_decl1 && func_decl2) {
                return -1
            }
            else {
                return 0
            }
        })
        
        this.current_scope = this.symbol_manager.get_scope(node.body.uid)

        this.load_bootsrap_nasm()
        this.fill_extern_symbols()
        this.fill_system_symbols()

        node.body.children.forEach(stm => {
            this.visit(stm)
        })
    }
    visit_BlockStmNode(node: BlockStmNode): void {
        this.current_scope = this.symbol_manager.get_scope(node.uid)
        node.children.forEach(stm => {
            this.visit(stm)
        })
        this.current_scope = this.current_scope?.parent_scope!
    }
    visit_AssignStmNode(node: AssignStmNode): void {
        let var_name: string = node.name
        this.visit(node.value)
        // var in function
        if (this.current_scope?.is_nested_in_func_scope(var_name)) {
            let offset = this.stack_frame_manager.get_var_offset(var_name)
            this.nasm.text(`mov [rbp-${offset}], rax`)
        }
        // var in global scope
        else {
            this.nasm.text(`mov [${var_name}], rax`)
        }
    }
    gen_arithmetic_op(op_type: TokenType, is_float_op: boolean): void {
        let buffer_mem = this.stack_frame_manager.BUFFER_MEM_NAME
        // ---- mov rax fpu stack
        this.nasm.text(`mov [${buffer_mem}], rax`)
        if (is_float_op) {
            this.nasm.text(`fld qword [${buffer_mem}]`)
        }
        else {
            this.nasm.text(`fild qword [${buffer_mem}]`)
        }
        // ---- mov rbx fpu stack
        this.nasm.text(`mov [${buffer_mem}], rbx`)
        if (is_float_op) {
            this.nasm.text(`fld qword [${buffer_mem}]`)
        }
        else {
            this.nasm.text(`fild qword [${buffer_mem}]`)
        }
        // ---- write operation
        if (op_type === TOKEN_TYPES.plus_op) {
            this.nasm.text(`fadd`)
        }
        else if (op_type === TOKEN_TYPES.minus_op) {
            this.nasm.text(`fsub`)
        }
        else if (op_type === TOKEN_TYPES.mul_op) {
            this.nasm.text(`fmul`)
        }
        else if (op_type === TOKEN_TYPES.div_op) {
            this.nasm.text(`fdiv`)
        }
        // ---- get op result from fpu stack
        if (is_float_op) {
            this.nasm.text(`fstp qword [${buffer_mem}]`)
        }
        else {
            this.nasm.text(`fistp qword [${buffer_mem}]`)
        }
        this.nasm.text(`mov rax, [${buffer_mem}]`)
    }
    gen_logic_op(op_type: TokenType): void {
        if (op_type === TOKEN_TYPES.and_op) {
            let and_start_label = this.nasm.gen_label("BOOL_AND_START")
            let right_and_label = this.nasm.gen_label("BOOL_AND_RIGHT")
            let and_end_label = this.nasm.gen_label("BOOL_AND_END")
            this.nasm.add_label(and_start_label)
            this.nasm.text(`test rax, rax`)
            this.nasm.text(`jnz ${right_and_label}`)
            this.nasm.text(`xor rax, rax`)
            this.nasm.text(`jmp ${and_end_label}`)
            this.nasm.add_label(right_and_label)
            this.nasm.text(`xor rax, rax`)
            this.nasm.text(`not rax`)
            this.nasm.add_label(and_end_label)
            this.nasm.text(`and rax, rbx`)
        }
        else if (op_type === TOKEN_TYPES.or_op) {
            this.nasm.text(`or rax, rbx`)
        }
    }
    gen_comparation_op(op_type: TokenType): void {
        let comp_start_label = this.nasm.gen_label("COMP_START")
        let right_comp_label = this.nasm.gen_label("COMP_RIGHT")
        let comp_end_label = this.nasm.gen_label("COMP_END")
        this.nasm.add_label(comp_start_label)
        this.nasm.text("cmp rax, rbx")
        if(op_type === TOKEN_TYPES.greater_equal_op) {
            this.nasm.text(`jge ${right_comp_label}`)
        }
        else if(op_type === TOKEN_TYPES.greater_op) {
            this.nasm.text(`jg ${right_comp_label}`)
        }
        else if(op_type === TOKEN_TYPES.less_equal_op) {
            this.nasm.text(`jle ${right_comp_label}`)
        }
        else if(op_type === TOKEN_TYPES.less_op) {
            this.nasm.text(`jl ${right_comp_label}`)
        }
        else if(op_type === TOKEN_TYPES.equal_op) {
            this.nasm.text(`je ${right_comp_label}`)
        }
        this.nasm.text(`xor rax, rax`)
        this.nasm.text(`jmp ${comp_end_label}`)
        this.nasm.add_label(right_comp_label)
        this.nasm.text(`mov rax, 1`)
        this.nasm.add_label(comp_end_label)
    }
    visit_BinOpNode(node: BinOpNode): void {
        this.nasm.add_label(this.nasm.gen_label("BINOP_START"))
        this.visit(node.left)   // generate 'mov rax, l_operand'
        this.nasm.text(`mov rcx, rax`)
        this.visit(node.right)  // generate 'mov rax, r_operand'
        this.nasm.text(`mov rbx, rax`)
        this.nasm.text(`mov rax, rcx`)
        // left operand in rax, right in rbx
        let op_type = node.token.type
        if (
            op_type === TOKEN_TYPES.plus_op ||
            op_type === TOKEN_TYPES.minus_op ||
            op_type === TOKEN_TYPES.mul_op ||
            op_type === TOKEN_TYPES.div_op    
        ) {
            let is_float_op = node.type.name === DATA_TYPES.doub ? true : false
            this.gen_arithmetic_op(op_type, is_float_op)
        }
        else if (
            op_type === TOKEN_TYPES.and_op ||
            op_type === TOKEN_TYPES.or_op
        ) {
            this.gen_logic_op(op_type)
        }
        else {
            this.gen_comparation_op(op_type)
        }
        this.nasm.add_label(this.nasm.gen_label("BINOP_END"))
    }
    gen_addr_recieving_op(node: VarNode): void {
        let var_name = node.name
        // var in function
        if (this.current_scope?.is_nested_in_func_scope(var_name)) {
            let offset = this.stack_frame_manager.get_var_offset(var_name)
            this.nasm.text(`lea rax, [rbp-${offset}]`)
        }
        // var in global scope
        else {
            this.nasm.text(`lea rax, [${var_name}]`)
        }
    }
    gen_dereferencing_op(node: VarNode): void {
        let var_name = node.name
        // var in function
        if (this.current_scope?.is_nested_in_func_scope(var_name)) {
            let offset = this.stack_frame_manager.get_var_offset(var_name)
            this.nasm.text(`mov rax, [rbp-${offset}]`)
            this.nasm.text(`mov rax, [rax]`)
        }
        // var in global scope
        else {
            this.nasm.text(`mov rax, [${var_name}]`)
            this.nasm.text(`mov rax, [rax]`)
        }
    }
    visit_UnOpNode(node: UnOpNode): void {
        if (node.token.type === TOKEN_TYPES.address_op && node.left instanceof VarNode) {
            this.gen_addr_recieving_op(node.left)
            return 
        }
        else if (node.token.type === TOKEN_TYPES.mul_op && node.left instanceof VarNode) {
            this.gen_dereferencing_op(node.left)
            return 
        }
        this.visit(node.left) // generate: mov rax, expr
        if (node.token.type === TOKEN_TYPES.minus_op) {
            if (node.type.name === DATA_TYPES.int) {
                this.nasm.text("not rax")
                this.nasm.text("inc rax")
            }
            else {
                this.nasm.text("mov rbx, rax")
                this.nasm.text("mov rax, 0")
                this.gen_arithmetic_op(TOKEN_TYPES.minus_op,true)
            }
        }
    }
    visit_LiteralNode(node: LiteralNode): void {
        let value = node.token.value
            
        if (node.type.name == DATA_TYPES.int) {
            this.nasm.text(`mov rax, ${value}`)
        }
        else if (node.type.name == DATA_TYPES.doub) {
            this.nasm.text(`mov rax, __float64__(${value})`)
        }
        else if (node.type.name == DATA_TYPES.str) {
            let str_name = 
                "str_"+uid(10)
            this.nasm.data(`${str_name} db "${value}",0xa,0`)
            this.nasm.text(`mov rax, ${str_name}`)
        }
    }
    visit_IfStmNode(node: IfStmNode): void {
        let start_label = this.nasm.gen_label("COND_START")
        let if_label = this.nasm.gen_label("IF_START")
        let if_end_label = this.nasm.gen_label("IF_END")
        let end_label = this.nasm.buffer_label
        if (end_label.length < 1) {
            end_label = this.nasm.gen_label("COND_END")
            this.nasm.buffer_label = end_label
        }

        // let else_label = this.nasm.gen_label("ELSE")
        this.nasm.add_label(start_label)
        if (node.condition !== null) {
            this.visit(node.condition) // generate 'mov rax, condition_result'
        }
        else {
            this.nasm.text(`mov rax, 1`)
        }
        this.nasm.text(`test rax, rax`)
        this.nasm.text(`jz ${if_end_label}`)
        this.nasm.add_label(if_label)
        this.visit(node.body) // generate if body
        this.nasm.text(`jmp ${end_label}`)
        this.nasm.add_label(if_end_label)

        if (node.alternate !== undefined) {
            this.visit(node.alternate)
        }
        else {
            this.nasm.add_label(end_label)
            this.nasm.buffer_label = ""
        }

    }
    visit_ForStmNode(node: ForStmNode): void {
        let start_label = this.nasm.gen_label("FOR_START")
        let end_label = this.nasm.gen_label("FOR_END")
        let var_name = node.init_stm.var_name
        this.visit(node.init_stm)
        this.nasm.add_label(start_label)
        this.visit(node.condition)
        this.nasm.text(`test rax, rax`)
        this.nasm.text(`jz ${end_label}`)
        this.visit(node.body)
        this.visit(node.update_stm)
        this.nasm.text(`jmp ${start_label}`)
        this.nasm.add_label(end_label)
    }
    visit_FuncDeclStmNode(node: FuncDeclStmNode): void {
        const arg_registers = [
            "rdi","rsi","rdx","rcx","r8","r9"
        ]
        const float_arg_registers = [
            "xmm0","xmm1","xmm2","xmm3","xmm4","xmm5"
        ]
        let func_name = node.func_name
        let params = node.params
        let body = node.body
        
        this.nasm.add_label(`${node.func_name}`)
        this.nasm.text(`push rbp`)
        this.nasm.text(`mov rbp, rsp`)

        this.current_scope = this.symbol_manager.get_scope(body.uid)
        // params filling
        let offset: number
        let int_args_index = 0
        let float_args_index = 0
        for (let i = 0; i < params.length; i++) {
            offset = this.stack_frame_manager.add_var(params[i].name)
            if (params[i].type.name !== DATA_TYPES.doub) {
                this.nasm.text(`mov [rbp-${offset}], ${arg_registers[int_args_index]}`)
                int_args_index++
            }
            else {
                this.nasm.text(`movq [rbp-${offset}], ${float_arg_registers[float_args_index]}`)
                float_args_index++
            }
        }
        // function body
        body.children.forEach(stm => {
            this.visit(stm)
        })
        this.current_scope = this.current_scope?.parent_scope!

        // clear all local vars in stack frame manager
        this.stack_frame_manager.clear()

        this.nasm.text(`xor rax, rax`)
        this.nasm.text(`mov rsp, rbp`)
        this.nasm.text(`pop rbp`)
        this.nasm.text(`ret`)
    }
    visit_ReturnStmNode(node: ReturnStmNode): void {
        this.visit(node.expr) // generate mov rax, expr
        this.nasm.text(`mov rsp, rbp`)
        this.nasm.text(`pop rbp`)
        this.nasm.text(`ret`)
    }
    visit_VarDeclStmNode(node: VarDeclStmNode): void {
        let var_name: string = node.var_name
        this.visit(node.init_value)     // generate: mov rax, init_value

        // var declaration in function
        if (this.current_scope?.is_nested_in_func_scope(var_name)) {
            let offset = this.stack_frame_manager.add_var(var_name)
            this.nasm.text(`mov [rbp-${offset}], rax ; "${var_name}" local var.`)
        }
        // var declaration in global scope
        else {
            this.nasm.bss(`${var_name} resb 8`)
            this.nasm.text(`mov [${var_name}], rax`)
        }        
    }
    visit_VarNode(node: VarNode): void {
        let var_name = node.name
        // var in function
        if (this.current_scope?.is_nested_in_func_scope(var_name)) {
            let offset = this.stack_frame_manager.get_var_offset(var_name)
            this.nasm.text(`mov rax, [rbp-${offset}]`)
        }
        // var in global scope
        else {
            this.nasm.text(`mov rax, [${var_name}]`)
        }
    }
    visit_FuncCallStmNode(node: FuncCallStmNode): void {
        const func_name = node.func_name
        let args = node.args
        
        let default_registers = [
            "rdi","rsi","rdx","rcx","r8","r9"
            //str  n     fact
        ]

        let float_registers = [
            "xmm0","xmm1","xmm2","xmm3","xmm4","xmm5"
        ]

        if(args.length <= default_registers.length) {
            this.nasm.text(`; ------ funccall -> ${func_name}`)

            let default_args: AstNode[] = []
            let float_args: AstNode[] = []
            args.forEach(arg => {
                if (arg instanceof TypedAstNode) {
                    if (arg.type.name !== DATA_TYPES.doub) {
                        default_args.push(arg)
                    }
                    else {
                        float_args.push(arg)
                    }
                }
            })

            // default typed funccalls
            default_args.forEach((arg, i) => {
                if (arg instanceof FuncCallStmNode) {
                    this.visit(arg)
                    this.nasm.text(`mov ${default_registers[i]}, rax`)
                    default_registers.splice(i,1)
                }
            })

            // float typed funccalls
            float_args.forEach((arg, i) => {
                if (arg instanceof FuncCallStmNode) {
                    this.visit(arg)
                    this.nasm.text(`movq ${float_registers[i]}, rax`)
                    float_registers.splice(i,1)
                }
            })

            // default typed arguments
            default_args.forEach((arg, i) => {
                if (!(arg instanceof FuncCallStmNode)) {
                    this.visit(arg)
                    this.nasm.text(`mov ${default_registers.shift()}, rax`)
                }
            })

            // float typed arguments
            float_args.forEach((arg, i) => {
                if (!(arg instanceof FuncCallStmNode)) {
                    this.visit(arg)
                    this.nasm.text(`movq ${float_registers.shift()}, rax`)
                }
            })
            this.nasm.text(`sub rsp, 16`)
            this.nasm.text(`mov rax, ${float_args.length}`)
            this.nasm.text(`call ${func_name}`)
            this.nasm.text(`add rsp, 16`)
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

        LogManager.success(`Run by: ${"./"+this.output_filename}.`)
    }
    private compile_nasm(): void {
        try {
            execSync(`nasm -f elf64 ${this.output_filename}.asm -o ${this.output_filename}.o `)
            execSync(`nasm -f elf64 ${NASM_BOOTSTRAP_PATH}.asm -o ${OUTPUT_DIR}/${NASM_BOOTSTRAP_NAME}.o `)
            LogManager.log("Compiled successfully.")
        } catch (err) {
            LogManager.error("Compilation failed.", "Linux_x86_64.ts")
        }
    }
    private link_obj(): void {
        let cmd = `ld `
        let linker_path = ``
        if (this.symbol_manager.shared_libs_list.length > 0) {
            cmd += `-lc -lglut -lGL -dynamic-linker `
            linker_path = SharedLibManager.find_ld_linker_path()
            cmd += (linker_path+" ")
            // this.symbol_manager.shared_libs_list.forEach(lib_path => {
            //     cmd += (lib_path+" ")
            // })
        }
        cmd += `${this.output_filename}.o ${OUTPUT_DIR}/${NASM_BOOTSTRAP_NAME}.o -o ${this.output_filename}`
        cmd = cmd.replace(/(\r\n|\n|\r)/gm, "");
        try {
            execSync(cmd)
            LogManager.log("Linked successfully.")
        }
        catch (err) {
            LogManager.error("Linking failed.", "Linux_x86_64.ts")
        }
    }
    
}
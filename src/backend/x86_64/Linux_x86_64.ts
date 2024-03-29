import { TokenType } from './../../frontend/SyntaxAnalyzer/Tokens';
import { DATA_TYPES } from './../../frontend/DataTypes';
import { ScopeTypes, SymbolTable, ArraySymbol } from './../../frontend/SymbolManager';
import { SharedLibManager, LogManager, uid, dump, exit } from './../../utils';
import { SymbolManager } from './../../frontend/SymbolManager';
import * as SYSTEM_SYMBOLS from "./../../frontend/SystemSymbols"
import { writeFileSync, existsSync, mkdirSync } from "fs"
import { execSync } from "child_process"
import path from "path"
import { cwd } from "process"
import { BinOpNode, UnOpNode, LiteralNode, AstNode, AssignStmNode, BlockStmNode, ProgramNode, VarNode, SharedImpStmNode, FuncCallStmNode, EOFStmNode, VarDeclStmNode, IfStmNode, ForStmNode, FuncDeclStmNode, AstStatementNode, ReturnStmNode, TypedAstNode, ArrayDeclStmNode, ArrayExprNode, ArrayMemberNode, ArrayMemberAssignStmNode } from "./../../frontend/AST/AST";
import { INodeVisitor } from "./../../frontend/AST/INodeVisitor";
import { TOKEN_TYPES } from "./../../frontend/SyntaxAnalyzer/Tokens";
import BaseBackend from '../BaseBackend';
import { COMPILER_CONFIG } from './../../config/CompilerConfig';


const NASM_BOOTSTRAP_PATH = path.join(__dirname + "/../../../bootstrap/nasm_x86_64_linux.asm")
const TMP_DIR = path.join(cwd() + "/tmp/")


class NasmWriter {
    private _extern: string = `;\tthis assembly file generated by compiler`
    private _text: string = `segment .text\nglobal _start\n_start:`
    private _bss: string = `segment .bss`
    private _data: string = `segment .data`
    private _label_counter: number = 0
    ifelse_buffer_labels: string[] = []
    ifelse_nesting_index: number = 0
    extern(source: string): void {
        this._extern += ("\n\t" + source)
    }
    text(source: string): void {
        this._text += ("\n\t" + source)
    }
    gen_label(label: string): string {
        let new_label = (label + "__" + uid(5) + "___" + this._label_counter)
        this._label_counter++
        return new_label
    }
    add_label(label: string): void {
        this._text += ("\n" + label + ":")
    }
    bss(source: string): void {
        this._bss += ("\n\t" + source)
    }
    data(source: string): void {
        this._data += ("\n\t" + source)
    }
    get_source(): string {
        return this._extern + "\n" + this._text + "\n" + this._bss + "\n" + this._data
    }
}

class StackFrameManager {
    readonly BUFFER_MEM_NAME: string
    private symbols: Map<string, number>
    private local_var_offset: number
    constructor() {
        this.symbols = new Map()
        this.local_var_offset = 0
        this.BUFFER_MEM_NAME = "buffer_" + uid(5)
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

export class Linux_x86_64 extends BaseBackend implements INodeVisitor {
    ast: AstNode
    symbol_manager: SymbolManager
    stack_frame_manager: StackFrameManager
    nasm: NasmWriter
    current_scope: SymbolTable | null = null
    constructor(ast: AstNode, symbol_manager: SymbolManager) {
        super(ast, symbol_manager)
        this.ast = ast
        this.symbol_manager = symbol_manager
        this.stack_frame_manager = new StackFrameManager()
        this.nasm = new NasmWriter();
    }
    fill_extern_symbols(): void {
        this.current_scope?.symbols.forEach(symbol => {
            if (symbol.IS_EXTERNAL && symbol.IS_REALLY_USED) {
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
        // ---- push rax to fpu stack
        this.nasm.text(`mov [${buffer_mem}], rax`)
        if (is_float_op) {
            this.nasm.text(`fld qword [${buffer_mem}]`)
        }
        else {
            this.nasm.text(`fild qword [${buffer_mem}]`)
        }
        // ---- push rbx to fpu stack
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
        if (op_type === TOKEN_TYPES.greater_equal_op) {
            this.nasm.text(`jge ${right_comp_label}`)
        }
        else if (op_type === TOKEN_TYPES.greater_op) {
            this.nasm.text(`jg ${right_comp_label}`)
        }
        else if (op_type === TOKEN_TYPES.less_equal_op) {
            this.nasm.text(`jle ${right_comp_label}`)
        }
        else if (op_type === TOKEN_TYPES.less_op) {
            this.nasm.text(`jl ${right_comp_label}`)
        }
        else if (op_type === TOKEN_TYPES.equal_op) {
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
        this.nasm.text(`push rbx`)
        this.visit(node.right)  // generate 'mov rax, r_operand'
        this.nasm.text(`mov rbx, rax`)
        this.visit(node.left)   // generate 'mov rax, l_operand'
        // left operand in rax, right in rbx
        let op_type = node.token.type
        if (
            op_type === TOKEN_TYPES.plus_op ||
            op_type === TOKEN_TYPES.minus_op ||
            op_type === TOKEN_TYPES.mul_op ||
            op_type === TOKEN_TYPES.div_op
        ) {
            let is_float_op = node.type.name === DATA_TYPES.doub
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
        this.nasm.text(`pop rbx`)
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
        this.visit(node.left) // generate: mov rax, expr_res
        if (node.token.type === TOKEN_TYPES.minus_op) {
            if (node.type.name === DATA_TYPES.int) {
                this.nasm.text("not rax")
                this.nasm.text("inc rax")
            }
            else {
                this.nasm.text("push rbx")
                this.nasm.text("mov rbx, rax")
                this.nasm.text("mov rax, 0")
                this.gen_arithmetic_op(TOKEN_TYPES.minus_op, true)
                this.nasm.text("pop rbx")
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
            let str_name = "str_" + uid(10)
            this.nasm.data(str_name + " db `" + value + "`,0")
            this.nasm.text(`mov rax, ${str_name}`)
        }
    }
    visit_IfStmNode(node: IfStmNode): void {
        let start_label = this.nasm.gen_label("COND_START")
        let if_label = this.nasm.gen_label("IF_START")
        let if_end_label = this.nasm.gen_label("IF_END")
        let end_label = this.nasm.ifelse_buffer_labels[this.nasm.ifelse_nesting_index]
        if (!end_label?.length) {
            end_label = this.nasm.gen_label("COND_END")
            this.nasm.ifelse_buffer_labels[this.nasm.ifelse_nesting_index] = end_label
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
        this.nasm.ifelse_nesting_index++
        this.visit(node.body) // generate if body
        this.nasm.ifelse_nesting_index--
        this.nasm.text(`jmp ${end_label}`)
        this.nasm.add_label(if_end_label)

        if (node.alternate === undefined || node.alternate === null) {
            this.nasm.add_label(end_label)
            this.nasm.ifelse_buffer_labels[this.nasm.ifelse_nesting_index] = ""
        }
        else {
            this.visit(node.alternate)
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
            "rdi", "rsi", "rdx", "rcx", "r8", "r9"
        ]
        const float_arg_registers = [
            "xmm0", "xmm1", "xmm2", "xmm3", "xmm4", "xmm5"
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
                // this.nasm.text(`mov [rbp-${offset}], ${arg_registers[int_args_index]}`)
                this.nasm.text(`push ${arg_registers[int_args_index]}`)
                int_args_index++
            }
            else {
                // this.nasm.text(`movq [rbp-${offset}], ${float_arg_registers[float_args_index]}`)
                this.nasm.text(`push ${float_arg_registers[float_args_index]}`)
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
        offset = 0
        int_args_index = params.length - 1
        float_args_index = 0
        // console.log(arg_registers)
        for (let i = params.length - 1; i >= 0; i--) {
            // offset = this.stack_frame_manager.add_var(params[i].name)
            if (params[i].type.name !== DATA_TYPES.doub) {
                // this.nasm.text(`mov [rbp-${offset}], ${arg_registers[int_args_index]}`)
                this.nasm.text(`pop ${arg_registers[int_args_index]}`)
                int_args_index--
            }
            else {
                // this.nasm.text(`movq [rbp-${offset}], ${float_arg_registers[float_args_index]}`)
                this.nasm.text(`pop ${float_arg_registers[float_args_index]}`)
                float_args_index++
            }
        }

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
            this.stack_frame_manager.add_var("") // this need to align stack with 16 bytes border
            this.stack_frame_manager.add_var(var_name)
            this.nasm.text(`push 0`) // this need to align stack with 16 bytes border
            this.nasm.text(`push rax`)
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
    visit_ArrayDeclStmNode(node: ArrayDeclStmNode): void {
        let arr_name = node.array_name
        let arr_size = node.size
        let arr_length = arr_size.reduce((res, current) => res * current)
        this.nasm.data(`${arr_name} times ${arr_length} dq 0`)
        this.visit(node.init_value)
    }
    visit_ArrayExprNode(node: ArrayExprNode, parent_index: number = 0): void {
        let name = node.arr_name
        let arr_size: Number[] = node.size
        let depth = node.depth
        node.members.forEach((member, i) => {
            if (member instanceof ArrayExprNode) {
                this.visit_ArrayExprNode(member, i)
            }
            else {
                this.visit(member)      // generate: mov rax, member_value
                this.nasm.text(`mov [${name}+${arr_size[depth]}*8*${parent_index}+8*${i}], rax`)
            }
        })
    }
    visit_ArrayMemberNode(node: ArrayMemberNode, address_only: boolean = false): void {
        let arr_name = node.array_name
        let arr_index = node.index
        let defined_array = this.current_scope?.get(node.array_name)
        if (defined_array instanceof ArraySymbol) {
            let size = defined_array.size
            this.nasm.text(`; ------> array member node`)
            if (arr_index.length == 1) {
                this.visit(arr_index[0])
                this.nasm.text(`shl rax, 3`)
                this.nasm.text(`add rax, ${arr_name}`)
                if (!address_only) {
                    this.nasm.text(`mov rax, [rax]`)
                }
            }
            else if (arr_index.length == 2) {
                this.nasm.text(`push rbx`)
                this.visit(arr_index[0])
                this.nasm.text(`mov rbx, ${size[1]}`)
                this.nasm.text(`mul rbx`)
                this.nasm.text(`shl rax, 3`)
                this.nasm.text(`push rax`)
                this.visit(arr_index[1])
                this.nasm.text(`shl rax, 3`)
                this.nasm.text(`pop rbx`)
                this.nasm.text(`add rax, rbx`)
                this.nasm.text(`add rax, ${arr_name}`)
                if (!address_only) {
                    this.nasm.text(`mov rax, [rax]`)
                }
                this.nasm.text(`pop rbx`)
            }
            else {
                LogManager.error(`Invalid array length`, `Linux_x86_64.ts`)
            }
            this.nasm.text(`; ------> array member node end`)
        }

    }
    visit_ArrayMemberAssignStmNode(node: ArrayMemberAssignStmNode): void {
        // this.nasm.text(`push rbx`)
        // this.nasm.text(`push 0`)
        this.visit(node.value) // generate: mov rax, expr_value
        this.nasm.text(`mov rbx, rax`)
        this.visit_ArrayMemberNode(node.arr_member, true) // generate: mov rax, element_address
        this.nasm.text(`mov [rax], rbx`)
        // this.nasm.text(`pop rbx`)
        // this.nasm.text(`pop rbx`)
    }
    visit_FuncCallStmNode(node: FuncCallStmNode): void {
        const func_name = node.func_name
        let args = node.args

        let default_registers = [
            "rdi", "rsi", "rdx", "rcx", "r8", "r9"
            //str  n     fact
        ]

        let float_registers = [
            "xmm0", "xmm1", "xmm2", "xmm3", "xmm4", "xmm5"
        ]

        if (args.length <= default_registers.length) {
            this.nasm.text(`; ------ funccall -> ${func_name}`)

            let default_args: AstNode[] = []
            let float_args: AstNode[] = []
            args.forEach(arg => {
                if (arg instanceof FuncCallStmNode) {
                    let defined_func = this.current_scope?.get(arg.func_name)
                    if (defined_func?.IS_EXTERNAL) {
                        LogManager.error(`You cannot specify dynamically imported function as argument (${arg.func_name}()). Try to create var with the result of function and then specify it as an argument. (WILL BE FIXED)`, "Linux_x86_64_ts")
                    }
                }
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
                    default_registers.splice(i, 1)
                }
            })

            // float typed funccalls
            float_args.forEach((arg, i) => {
                if (arg instanceof FuncCallStmNode) {
                    this.visit(arg)
                    this.nasm.text(`movq ${float_registers[i]}, rax`)
                    float_registers.splice(i, 1)
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
        let visit_method = "this.visit_" + node.constructor.name + "(node)"
        return eval(visit_method)
    }
    compile(): void {
        this.visit(this.ast)

        if (!existsSync(TMP_DIR)) {
            mkdirSync(TMP_DIR);
        }
        writeFileSync(`${TMP_DIR}tmp.asm`, this.nasm.get_source())

        this.compile_nasm()
        this.link_obj()

        LogManager.success(`Run by: ${COMPILER_CONFIG.output_file}.`)
    }
    private compile_nasm(): void {
        try {
            let source_comp = `nasm -f elf64 ${TMP_DIR}tmp.asm -o ${TMP_DIR}tmp.o `
            let bootstrap_comp = `nasm -f elf64 ${NASM_BOOTSTRAP_PATH} -o ${TMP_DIR}/bootstrap.o `
            LogManager.log(bootstrap_comp)
            LogManager.log(source_comp)
            execSync(source_comp)
            execSync(bootstrap_comp)
            LogManager.log("Compiled successfully.")
        } catch (err) {
            LogManager.error("Compilation failed.", "Linux_x86_64.ts")
        }
    }
    private link_obj(): void {
        let cmd = `ld `
        let linker_path = ``
        if (this.symbol_manager.shared_libs_list.length > 0) {
            let libs_shortnames = this.symbol_manager.shared_libs_list
            libs_shortnames.forEach(name => cmd += "-" + name + " ")
            cmd += `-dynamic-linker `
            linker_path = SharedLibManager.find_ld_linker_path()
            cmd += (linker_path + " ")
            // this.symbol_manager.shared_libs_list.forEach(lib_path => {
            //     cmd += (lib_path+" ")
            // })
        }
        cmd += `${TMP_DIR}tmp.o ${TMP_DIR}bootstrap.o -o ${COMPILER_CONFIG.output_file}`
        cmd = cmd.replace(/(\r\n|\n|\r)/gm, "");
        try {
            LogManager.log(cmd)
            execSync(cmd)
            LogManager.log("Linked successfully.")
        }
        catch (err) {
            LogManager.error("Linking failed.", "Linux_x86_64.ts")
        }
    }

}
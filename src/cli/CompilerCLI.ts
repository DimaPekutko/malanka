import { Command } from "commander"
import { cwd } from "process"
import fs from "fs"
import path from "path";
import { exit, LogManager, read_from_file, dump } from "./../utils";
import { Lexer } from "./../frontend/SyntaxAnalyzer/Lexer";
import { Parser } from "./../frontend/SyntaxAnalyzer/Parser";
import { SymbolManager } from "./../frontend/SymbolManager";
import { SemanticAnalyzer } from "./../frontend/SematicAnalyzer/SemanticAnalyzer";
import { Linux_x86_64 } from "./../backend/x86_64/Linux_x86_64";
import { LLVMBackend } from "./../backend/llvm/LLVMBackend";
import { COMPILER_CONFIG } from "./../config/CompilerConfig";
import BaseBackend from "./../backend/BaseBackend";
import package_json from "./../../package.json"

export default class CompilerCLI {
    cli: Command
    constructor() {
        this.cli = new Command();
    }
    parse() {
        this.cli
            .name("Malanka Language")
            .description("Compiler for malanka language.")
            .version(package_json.version)
            .argument("<file>", "File to compile")
            .option("-l, --log_output", "Will print the compilation process")
            .option("-leg, --legacy", "Starts rude linux x86-64 nasm code generation")
            .action(this.on_argparse_action.bind(this))
            .parse()
    }
    private run() {
        // const file_name = path.parse(file_path).name
        let code: string = read_from_file(COMPILER_CONFIG.input_file)

        LogManager.log("Converting code into tokens..")
        const lexer = new Lexer(code)
        const tokens = lexer.tokenize()
        LogManager.log("Tokens parsed.")

        LogManager.log("Start building AST Tree...")
        const parser = new Parser(tokens)
        const ast = parser.parse()
        LogManager.log("AST built.")
   
        LogManager.log("Starting semantic analyze...")
        const symbol_manager = new SymbolManager()
        const semantic_analyzer = new SemanticAnalyzer(ast, symbol_manager)
        semantic_analyzer.analyze()
        LogManager.log("Code analyzed. No errors found.")

        LogManager.log("Start building...")
        let compiler = new COMPILER_CONFIG.backend(ast, symbol_manager)
        compiler.compile();
    }
    private on_argparse_action(file_arg: string, options: any) {
        let file_path = path.join(cwd(), file_arg)
        let file = path.parse(file_path)

        if (file.ext === ".mal") {
            // if file exists check
            if (fs.existsSync(file_path) && fs.lstatSync(file_path).isFile()) {
                // setup config
                COMPILER_CONFIG.to_log = Boolean(options?.log_output)
                COMPILER_CONFIG.input_file = file_path
                COMPILER_CONFIG.output_file = path.join(file.dir, file.name)
                COMPILER_CONFIG.backend = Boolean(options?.legacy) ?
                    Linux_x86_64 :
                    LLVMBackend
        
                this.run()
            }
            else {
                LogManager.error(`No such file "${file_path}"`, "") 
            }
        }
        else {
            LogManager.error(`Invalid file extension "${file.ext}"`, "")
        }

        // console.log(file_path)
        
        // let path_parts = file.split(".")
        // let ext = path_parts[path_parts.length - 1]
        // if (ext !== "mal") {
        //     LogManager.error(`Invalid file extension .${ext}`, "")
        // }
        // const file_path = path.join(cwd(), file)
        // if (fs.existsSync(file_path) && fs.lstatSync(file_path).isFile()) {
        //     COMPILER_CONFIG.to_log = !Boolean(options?.log_output)
        //     COMPILER_CONFIG.input_file = file_path
        //     // COMPILER_CONFIG.output_file = 
        //     console.log(file_path)
            
        //     // COMPILER_CONFIG.input_files = []
        //     this.run()
        // }
        // else {
        //     LogManager.error(`No such file "${file_path}"`, "")
        // }
    }
}
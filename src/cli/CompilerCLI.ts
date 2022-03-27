import { Command } from "commander"
import { cwd } from "process"
import fs from "fs"
import path from "path";
import { exit, LogManager, read_from_file } from "./../utils";
import { Lexer } from "./../frontend/SyntaxAnalyzer/Lexer";
import { Parser } from "./../frontend/SyntaxAnalyzer/Parser";
import { SymbolManager } from "./../frontend/SymbolManager";
import { SemanticAnalyzer } from "./../frontend/SematicAnalyzer/SemanticAnalyzer";
import { Linux_x86_64 } from "./../backend/x86_64/Linux_x86_64";

export default class CompilerCLI {
    cli: Command
    constructor() {
        this.cli = new Command();
    }
    parse() {
        this.cli
        .name("Malanka Language")
        .description("Compiler for malanka language.")
        .version("0.0.1")
        .argument("<file>","File to compile")
        .option("-l, --log_output")
        .action(this.on_argparse_action.bind(this))
        .parse()
    }
    private run(file_path: string) {
        const file_name = path.parse(file_path).name 
        let code: string = read_from_file(file_path)
        
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
        let compiler = new Linux_x86_64(ast, symbol_manager, cwd()+"/"+file_name)
        compiler.compile();
    }
    private on_argparse_action(str: string, options: any) {
        let parts = str.split(".")
        let ext = parts[parts.length-1]
        if (ext !== "mal") {
            LogManager.error(`Invalid file extension .${ext}`, "")
        }
        const file_path = cwd()+"/"+str
        if (fs.existsSync(file_path) && fs.lstatSync(file_path).isFile()) {
            if (options?.log_output) {
                LogManager.to_log = true
            }
            this.run(file_path)
        }
        else {
            LogManager.error(`No such file "${file_path}"`, "")
        }
    }
}
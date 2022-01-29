import { TOKEN_TYPES } from 'frontend/SyntaxAnalyzer/Tokens';
import { SemanticAnalyzer } from './frontend/SematicAnalyzer/SemanticAnalyzer';
import { Token } from 'frontend/SyntaxAnalyzer/Tokens';
import { dump, exit, LogManager, read_from_file } from './utils';
import { Parser } from './frontend/SyntaxAnalyzer/Parser';
import { Lexer } from './frontend/SyntaxAnalyzer/Lexer';
import { Linux_x86_64 } from 'backend/x86_64/Linux_x86_64';
import { SymbolManager } from 'frontend/SymbolManager';

const print_tokens = (tokens: Token[]): void => {
    tokens.forEach(token => {
        console.log(token.type.name)
    })
}

const main = (): void => {
    let code: string = read_from_file("./tmp/source.mal")

    LogManager.to_log = false

    LogManager.log("Converting code into tokens..")
    const lexer = new Lexer(code)    
    const tokens = lexer.tokenize()
    LogManager.log("Tokens parsed.")
    // print_tokens(tokens)
    // exit()

    LogManager.log("Start building AST Tree...")
    const parser = new Parser(tokens)
    const ast = parser.parse()
    LogManager.log("AST built.")
    // dump(ast)
    // exit()

    LogManager.log("Starting semantic analyze...")
    const symbol_manager = new SymbolManager()
    const semantic_analyzer = new SemanticAnalyzer(ast, symbol_manager)
    semantic_analyzer.analyze()
    LogManager.log("Code analyzed. No errors found.")
    // dump(ast)

    LogManager.log("Start building...")
    let compiler = new Linux_x86_64(ast, symbol_manager, "./tmp/test")
    compiler.compile();
}

main();
import { TOKEN_TYPES } from 'frontend/SyntaxAnalyzer/Tokens';
import { SemanticAnalyzer } from './frontend/SematicAnalyzer/SemanticAnalyzer';
import { Token } from 'frontend/SyntaxAnalyzer/Tokens';
import { dump, exit, LogManager, read_from_file } from './utils';
import { Parser } from './frontend/SyntaxAnalyzer/Parser';
import { Lexer } from './frontend/SyntaxAnalyzer/Lexer';
import { Linux_x86_64 } from 'backend/x86_64/Linux_x86_64';
import { SymbolManager } from 'frontend/SymbolManager';

// dynamic "/lib/x86_64-linux-gnu/libc.so.6"



const print_tokens = (tokens: Token[]): void => {
    tokens.forEach(token => {
        console.log(token.type.name, token.value)
    })
}

const main = (): void => {
    let code: string = read_from_file("./tmp/source.mal")

    const lexer = new Lexer(code)    
    const tokens = lexer.tokenize()
    // print_tokens(tokens)

    const parser = new Parser(tokens)
    const ast = parser.parse()
    // dump(ast)

    const symbol_manager = new SymbolManager()
    const semantic_analyzer = new SemanticAnalyzer(ast, symbol_manager)
    semantic_analyzer.analyze()

    let compiler = new Linux_x86_64(ast, symbol_manager, "./tmp/test")
    compiler.compile();
}

main();
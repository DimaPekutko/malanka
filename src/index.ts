import { dump } from './utils';
import { Parser } from './frontend/SyntaxAnalyzer/Parser';
import { Lexer } from './frontend/SyntaxAnalyzer/Lexer';
import { Linux_x86_64 } from 'backend/x86_64/Linux_x86_64';

const TEST_SOURCE_CODE = 
`127-43-321+43`

const main = (): void => {
    let lexer = new Lexer(TEST_SOURCE_CODE)    
    let tokens = lexer.tokenize()
    // dump(tokens)
   
    let parser = new Parser(tokens)
    let ast = parser.parse()
    // dump(ast)

    let compiler = new Linux_x86_64(ast, "test")
    compiler.compile();
}

main();
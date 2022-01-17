import { Parser } from './frontend/Parser';
import { Lexer } from './frontend/Lexer';

const TEST_SOURCE_CODE = 
`1+2`

const main = (): void => {
    let lexer = new Lexer(TEST_SOURCE_CODE);    
    let tokens = lexer.tokenize();
    let parser = new Parser(tokens)
    console.log(tokens)
    parser.parse();

}


main()
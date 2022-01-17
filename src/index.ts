import { Lexer } from './frontend/Lexer/Lexer';

const TEST_SOURCE_CODE = 
`\t    `
const main = (): void => {
    let lexer = new Lexer(TEST_SOURCE_CODE);    
    let tokens = lexer.tokenize();
    console.log(tokens);
}


main()
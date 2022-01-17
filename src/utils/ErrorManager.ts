import { Token } from './../frontend/Tokens';

export abstract class ErrorManager {
    static throw_error(msg: string): void {
        console.log("ERROR! ", msg);
        ErrorManager.stop_process();
    }
    
    private static stop_process() {
        process.exit();        
    }
}
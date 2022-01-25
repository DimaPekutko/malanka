import util from "util"; 
import { execSync } from "child_process"
import { existsSync, readFileSync } from "fs";
import chalk from "chalk";

// log full object
export const dump = (obj: any) :void => {
    console.log(
        util.inspect(obj,false,null,true)
    )
}

export const read_from_file = (file: string): string => {
    let data = readFileSync(file, "utf-8")
    return data
}

export const is_int = (arg: any): boolean => {
    return Number(arg) === arg && arg % 1 === 0;
}

export const is_float = (arg: any): boolean => {
    return Number(arg) === arg && arg % 1 !== 0;
}

export const exit = () => process.exit()

export const uid = (length: number): string => {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *charactersLength));
    }
    return result;
}

export abstract class SharedLibManager {
    static get_lib_symbols(path: string): string {
        if (!existsSync(path)) {
            LogManager.error(
                `Undefined shared library path in dynamic import: ${path}`,
                "SharedLibManager.ts"
            )
        }
        const cmd =
            `readelf -d -T --dyn-syms ${path} | `+
            // `grep GLOBAL | `+
            `awk 'BEGIN { ORS = ""; print " [ "}
            { printf "%s{\\"size\\": \\"%s\\", \\"type\\": \\"%s\\", \\"name\\": \\"%s\\"}",
                  separator, $3, $4, $8
              separator = ", "
            }
            END { print " ] " }'`;
        let output: Buffer = execSync(cmd)
        let res_string: string = Buffer.from(output).toString()
        return res_string
    }
}

export abstract class LogManager {
    private static full_log = ``
    static to_log: boolean = true
    static error(msg: string, from: string): void {
        let error = chalk.red("[ERROR] ") + from + ": " + msg
        console.log(error)
        this.full_log += (error + "\n")
        exit()
    }
    static log(msg: string, from: string) {
        if(this.to_log) {
            let message = chalk.blueBright("[LOG] ") + from + ": " + msg
            console.log(message)
            this.full_log += (message + "\n")
        }
    }
    static success(msg: string, from: string) {
        if(this.to_log) {
            let message = chalk.greenBright("[SUCCESS] ") + from + ": " + msg
            console.log(message)
            this.full_log += (message + "\n")
        }
    }
}
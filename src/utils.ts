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
    static find_lib_path_by_shortname(short_name: string): string {
        let dist = "/lib/x86_64-linux-gnu/"
        let name = "lib"+short_name.substring(1)+".so."
        let output = execSync(`ls ${dist} | grep ${name} | head -1`)
        let finded_name = Buffer.from(output).toString().replace(/\s/g,'')
        if (finded_name.length < 1) {
            LogManager.error(`Cannot find "${name.substring(0,name.length-1)}" library in "${dist}" folder.`, "utils.ts")
        }
        return dist.concat(finded_name)
    }
    static find_ld_linker_path(): string {
        let output = execSync("ls /lib64 | grep ld-linux-x86-64.so")
        let linker_path: string = "/lib64/"+Buffer.from(output).toString()
        return linker_path
    }
}

export abstract class LogManager {
    private static full_log = ``
    static to_log: boolean = false
    static error(msg: string, from: string): void {
        let error = chalk.red("[ERROR] ") + from + ": " + msg
        console.log(error)
        this.full_log += (error + "\n")
        exit()
    }
    static log(msg: string, from: string = ":") {
        if(this.to_log) {
            let message = chalk.blueBright("[LOG] ") + from + ": " + msg
            console.log(message)
            this.full_log += (message + "\n")
        }
    }
    static success(msg: string, from: string = "=> :") {
        if(this.to_log) {
            let message = chalk.greenBright("[SUCCESS] ") + from + ": " + msg
            console.log(message)
            this.full_log += (message + "\n")
        }
    }
}
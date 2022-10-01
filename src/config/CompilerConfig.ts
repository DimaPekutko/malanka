import BaseBackend from "./../backend/BaseBackend"

type CONFIG_TEMPLATE = {

  to_log: boolean;
  input_file: string;
  output_file: string;
  backend: any;

}

export const COMPILER_CONFIG: CONFIG_TEMPLATE = {
  to_log: false,
  input_file: "",
  output_file: "",
  backend: null
}
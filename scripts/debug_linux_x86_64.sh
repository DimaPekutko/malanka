#!/usr/bin/env bash
nasm -f elf64 /home/dmitry/dev/malanka/bootstrap/nasm_x86_64_linux.asm -o /home/dmitry/dev/malanka/tmp//bootstrap.o
nasm -f elf64 /home/dmitry/dev/malanka/tmp/tmp.asm -o /home/dmitry/dev/malanka/tmp/tmp.o

ld -lc -dynamic-linker /lib64/ld-linux-x86-64.so.2 /home/dmitry/dev/malanka/tmp/tmp.o /home/dmitry/dev/malanka/tmp/bootstrap.o -o /home/dmitry/dev/malanka/main
echo "OK"
; extern printf
; extern puts
; extern exit
global __bootstrap 
global __ARGC__
global __ARGV__
section .text
__bootstrap:
    ; argc init
    mov rax, rsp
    add rax, 0x8
    mov [__ARGC__], rax
    ;argv* init 
    mov rax, rsp
    add rax, 0x16
    mov [__ARGV__], rax
    
    ; mov rdi, [__ARGV__]
    ; xor rax, rax
    ; call printf
    ; call exit

    xor rdi, rdi
    xor rsi, rsi
    xor rax, rax
    xor rbx, rbx
    xor rcx, rcx
    xor rdx, rdx

    ret
section .data
    s db "args count %d", 0xa, 0
    __ARGC__ dq 0
    __ARGV__ dq 0
; extern printf
; extern puts
; extern exit
global __bootstrap 
global char_to_int
global int_to_doub
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
char_to_int:
    push rbp
	mov rbp, rsp
    mov rax, rdi
    add rax, '0'
	mov rsp, rbp
    pop rbp
    ret
int_to_doub:
    push rbp
	mov rbp, rsp
    mov [rbp-8], rdi
    pxor xmm0, xmm0
    cvtsi2sd xmm0, [rbp-8]
    movq rax, xmm0
	mov rsp, rbp
    pop rbp
    ret
section .data
    s db "args count %d", 0xa, 0
    __ARGC__ dq 0
	__ARGV__ dq 0
	

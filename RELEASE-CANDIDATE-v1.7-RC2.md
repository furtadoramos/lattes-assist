# Lattes Assist v1.7 RC2

Release candidate criada a partir da RC1 após revisão específica de segurança contra perda de dados.

## Motivo da RC2

A RC1 foi aprovada nos testes automatizados de sintaxe, manifesto, integridade de módulos, recursos críticos, conflitos e exposição de segredos. Durante a revisão de promoção, porém, foi identificado que a restauração do backup limpava os stores do IndexedDB antes de repopulá-los em operações separadas. Uma falha intermediária poderia deixar o espaço local parcialmente restaurado ou vazio.

A RC2 existe exclusivamente para endurecer esse caminho sem modificar silenciosamente a RC1 congelada.

## Alteração principal

- validação estrutural ampliada do backup antes de qualquer mutação;
- decodificação e conferência dos blobs/base64 antes de substituir dados atuais;
- substituição dos stores `documents` e `files` em uma única transação IndexedDB `readwrite`;
- aborto automático da transação em caso de erro, preservando o estado anterior do banco;
- snapshot do IndexedDB, `localStorage`, estado serializável e XML/XSD atuais antes da aplicação do backup;
- rollback explícito do banco + armazenamento + estado caso ocorra falha depois da transação do IndexedDB;
- aviso de consumo de memória para backups com mais de 50 MB de arquivos originais;
- mensagens explícitas de sucesso, cancelamento e eventual falha crítica de rollback.

## Verificações obrigatórias da RC2

- sintaxe de todos os 28 módulos JavaScript;
- manifesto PWA válido;
- 28 módulos presentes no bootstrap e no cache do service worker;
- `app-28.js` carregado depois dos módulos anteriores;
- presença do caminho transacional e de rollback no hardening de backup;
- marcadores funcionais das funcionalidades herdadas da RC1;
- ausência de marcadores de conflito;
- ausência de secrets/service-role no frontend.

## Teste manual prioritário

1. Exportar um backup de um estado conhecido com documentos e fila.
2. Fazer uma pequena alteração no estado local depois da exportação.
3. Restaurar o backup e confirmar a recomposição integral.
4. Repetir com backup criptografado.
5. Testar um arquivo de backup propositalmente inválido e confirmar que o estado atual permanece intacto.

## Bloqueador externo antes da produção

Permanece o aviso do Supabase Security Advisor: `Leaked Password Protection Disabled`. A proteção contra senhas vazadas deve ser habilitada em Authentication > Providers > Email / configurações de senha, quando disponível no plano do projeto, antes da promoção da v1.7 para a raiz pública.

## Critério de promoção

A RC2 somente poderá substituir a v1.6 após a regressão automatizada ser integralmente aprovada, o teste manual de backup/restauração não revelar regressão e o bloqueador de proteção contra senhas vazadas ser resolvido ou conscientemente tratado conforme a disponibilidade do plano Supabase.

# Kanban Dev

Kanban leve e local, direto no VS Code. Sem conta, sem sincronização, sem nada saindo do seu projeto — o board vive junto com o código, versionado como qualquer outro arquivo.

## Por que

Ferramentas de kanban em SaaS (Trello, Jira, etc.) exigem login, internet e context-switch pra fora do editor. O Kanban Dev abre como uma aba normal do VS Code e guarda tudo em `.kanbn/board.json` na raiz do workspace — pode versionar no Git junto com o projeto ou ignorar, como preferir.

## Features

- **Board por projeto**: cada workspace tem seu próprio `.kanbn/board.json`, isolado dos demais.
- **Colunas customizáveis**: crie, renomeie, exclua e reordene colunas por drag & drop (padrão: A Fazer / Em Andamento / Concluído).
- **Tasks com drag & drop**: mova tasks entre colunas arrastando o card.
- **Checklist aninhado**: subtarefas dentro de cada task, com contagem de progresso (ex: 3/5).
- **Comentários por task**: histórico de anotações com timestamp.
- **Marcar como concluída**: toggle rápido de conclusão sem precisar mover para outra coluna.
- **100% local**: nenhum dado sai da sua máquina; não depende de internet nem de conta.

## Como instalar

### Pelo Marketplace
1. Abra a aba de Extensions no VS Code (`Ctrl+Shift+X`).
2. Busque por **Kanban Dev**.
3. Clique em **Install**.

### Via linha de comando
```bash
code --install-extension hadrianandrade.kanban-dev
```

### Manual (.vsix)
1. Baixe o arquivo `.vsix` da release.
2. No VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX...** → selecione o arquivo.

## Como usar

1. Abra um workspace/pasta no VS Code.
2. `Ctrl+Shift+P` → **Kanban Dev: Abrir Board** — abre o quadro em uma nova aba.
3. `Ctrl+Shift+P` → **Kanban Dev: Nova Task** — cria uma task rapidamente, escolhendo a coluna.
4. O board é salvo automaticamente em `.kanbn/board.json` a cada alteração.

## Dados e privacidade

O board fica inteiramente no arquivo local `.kanbn/board.json`, dentro do seu workspace. A extensão não faz nenhuma chamada de rede e não coleta telemetria.

## Licença

MIT

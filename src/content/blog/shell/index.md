---
title: Shell基础入门
description: 初步了解Shell的基础知识
pubDate: 2026-10-24
tags:
  - Shell
  - Linux
draft: false
---
## 1. 环境变量与 Shell

| 命令             | 作用             | 常用示例                   |
| -------------- | -------------- | ---------------------- |
| `echo`         | 输出/打印          | `echo $PATH`           |
| `export`       | 导出环境变量         | `export API_KEY=xxx`   |
| `env`          | 查看所有环境变量       | `env`                  |
| `source` / `.` | 在当前 shell 执行脚本 | `source ~/.bashrc`     |
| `alias`        | 命令别名           | `alias ll='ls -lah'`   |
| `history`      | 命令历史           | `history`、`!n` 执行第 n 条 |
| `type`         | 命令类型判定         | `type alias`           |

例：
```bash
export  PATH=$PATH:/home/book/Desktop
  ①        ②          ③
```
### ① `export`：把变量导出为环境变量

`export` 是 shell 的内建命令，作用是：

- 设置一个变量
- 并把它标记为“环境变量”，让**当前 shell 以及它启动的子进程**都能使用

`PATH` 本身就是一个环境变量，所以这里用 `export` 是标准写法。

### ② `PATH=`：给 PATH 变量赋值

等号左边是变量名 `PATH`，右边是新的值。
注意：等号两边**不能有空格**，否则 shell 会把它当成命令而不是赋值。

### ③ `$PATH:/home/book/Desktop`：在原有 PATH 后面追加一个目录

- `$PATH`：取当前 `PATH` 变量的值。比如原来是 `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`
- `:`：路径分隔符。PATH 里的多个目录用冒号隔开
- `/home/book/Desktop`：要新加进去的目录

所以整个右边就是：

```text
原来的PATH值:/home/book/Desktop
```

最终效果：`PATH` 变成了

```text
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/book/Desktop
```


当在终端输入一个命令，比如 `hello`，shell 会去 `PATH` 里列的目录中**依次查找**有没有叫 `hello` 的可执行文件。

之前 `PATH` 里没有 `/home/book/Desktop`，所以 shell 找不到你的 `hello`。  
执行这行命令后，`/home/book/Desktop` 被加进了查找列表，于是：

```bash
hello
```

就能找到 `/home/book/Desktop/hello` 并运行它，等同于：

```bash
./hello
```

> [!tip] 别名持久化
> 把 `alias ll='ls -lah'` 写入 `~/.bashrc`（bash）或 `~/.zshrc`（zsh），新开终端永久生效。

> [!abstract] Shell 变量和环境变量
> - **Shell 变量**：仅当前 shell 会话可见，`VAR=value` 直接赋值即生效。
> - **环境变量**：会被子进程继承，需用 `export VAR`（或 `export VAR=value`）导出。
> - 未 `export` 的变量在脚本 / 子 shell 中**不可见**。

| 变量                 | 含义           | 示例             |
| ------------------ | ------------ | -------------- |
| `PATH`             | 命令搜索路径（冒号分隔） | `echo $PATH`   |
| `HOME`             | 当前用户家目录      | `cd $HOME`     |
| `USER` / `LOGNAME` | 当前用户名        | `echo $USER`   |
| `SHELL`            | 默认登录 shell   | `/bin/bash`    |
| `PWD` / `OLDPWD`   | 当前 / 上一次目录   | `cd -`         |
| `LANG` / `LC_ALL`  | 语言与字符编码      | `zh_CN.UTF-8`  |
| `PS1`              | 命令提示符格式      | `[\u@\h \W]\$` |

> [!example] 配置文件加载顺序（bash）
> - 登录 shell：`/etc/profile` → `~/.bash_profile`（或 `~/.bash_login` / `~/.profile`）→ `~/.bashrc`
> - 非登录交互 shell：直接读取 `~/.bashrc`
> - 环境变量建议写入 `~/.bashrc`（交互）或 `~/.profile`（登录），改后 `source ~/.bashrc` 立即生效。

> [!warning] 子 shell 不会回传变量
> 在子 shell（`bash -c '...'`、管道右侧、`( ... )` 括号）中 `export` 或修改的变量，**不影响父 shell**。需要长期生效就写进配置文件，而不是临时在脚本里 export。

> [!tip] 删除与排查
> - `unset VAR`：删除变量
> - `printenv VAR`：只看环境变量（不看普通 shell 变量）
> - `echo "$VAR"`：**加双引号**，避免含空格的值被分词

---

## 2. Shell 命令解析

> [!info] 敲下的行，shell 是这样处理的
> 理解解析顺序能解释很多"为什么没按预期展开"的坑。Bash 处理一条命令大致按以下顺序：

---
### 1.shell是什么

shell 就是一个应用程序，我们可以通过键盘、串口给它发送命令，回车后它就会去执行这些命令。

以“ls  -l”命令为例:

① 接收键盘数据并回显
比如：我们使用键盘给 shell 程序发送字母 l，它收到后会在屏幕上显示出来

② 解析输入的字符串，寻找程序，执行程序：
当我们使用键盘给 shell 程序发送回车时，它就知道字符输入结束了


a. shell 会解析字符串，这些字符串用空格分为好几部分.第 1 部分就是程序名、命令名，其他部分是参数

b. shell 会去寻找该程序，去 PATH 环境变量所指示的位置找。也可以指定绝对、相对路径，shell 就会直接去这些路径找到程序

c. 找到程序后，会启动该程序，并传入参数

----

### 2.怎么设置PATH

以在PATH中添加/home/book目录为例：

#### 2.1 永久设置之一，这对所有用户都有效：

修改/etc/environment，比如：`sudo gedit /etc/environment` ，然后添加下行红包部分：

`PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/home/book" `

然后重启系统或重新登录。

#### 2.2 永久设置之二，只对当前用户有效：

修改~/.bashrc，在行尾添加或修改：

`export PATH=$PATH:/home/book`

然后重启系统或重新登录。

#### 2.3 临时设置,在终端执行以下命令，这只对当前终端有效：

`export PATH=$PATH:/home/book`

---
1. **读取与分词（tokenize）**：按空白和元字符把行拆成词。
2. **历史扩展**：`!` 相关（如 `!!`、`!n`）。
3. **别名扩展**：`alias` 定义的替换（仅交互 shell、非引号内）。
4. **大括号展开**：`{a,b}` → `a b`。
5. **波浪号展开**：`~` → 家目录。
6. **参数 / 变量展开**：`$VAR`、`${VAR}`。
7. **命令替换**：`$(cmd)` 或 `` `cmd` ``。
8. **算术展开**：`$((1+2))`。
9. **单词拆分（word splitting）**：按 `IFS` 把未引号的结果再拆词。
10. **路径名展开（glob）**：`*` `?` `[]` 匹配文件。
11. **引号移除**：去掉剩余引号。
12. **重定向与管道**：处理 `>` `>>` `<` `|`。
13. **命令查找与执行**：顺序为 别名 → 函数 → 内建命令 → `PATH` 中的外部程序。

> [!example] 顺序陷阱：引号决定一切
> ```bash
> files="*.txt"
> echo $files     # 未加引号 → 第9/10步展开为当前目录匹配的 .txt 文件名
> echo "$files"   # 加引号 → 第11步移除引号后保持字面量 "*.txt"
> ```
> 关键：**变量展开（第6步）发生在通配符展开（第10步）之前**，是否分词 / 通配取决于你有没有加引号。

> [!example] 命令替换 + 管道的执行
> ```bash
> echo $(ls) | grep log     # 先执行 $(ls) 得到文件列表，再交给 grep
> cat < file | sort > out   # < 重定向输入，> 重定向输出，中间走管道
> ```

> [!tip] 调试解析过程
> - `set -x`：开启后每条命令执行前打印"展开后的真实样子"，定位变量 / 引号问题神器；`set +x` 关闭。
> - `type cmd`：看清命令到底是别名、函数、内建还是外部程序（第13步的判定结果）。
> - 危险命令前先 `echo` 打印展开结果确认，再真正执行。

> [!warning] 常见误区
> - `find / -name *.txt` 会把 `*.txt` 先由 shell 展开（当前目录匹配）再传给 find → 应写为 `find / -name '*.txt'`（单引号保护）。
> - `for f in $(ls)` 会因空格分词把带空格的文件名拆碎 → 用 `for f in *` 或 `while read`。

---
> 不会就用 `man`；不确定就先 `--help`；危险操作先 `echo`/dry-run 验证；删前先备份。


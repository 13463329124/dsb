---
title: "在git上修改代码后发现master已经更新怎么办？（Sourcetree）"
date: "2026-04-16"
description: "​ 首先把自己修改的代码提交到分支上，（此时提交推送后，去和master合并会产生冲突） 那么如何解决这个master合并冲突呢？ 1.提交前，首先把master拉到最新状态 2.然后基于master新建一个新的分支 3.把修改代码的分支合并到新的分支上 4.最后把这个新的分支提..."
tags:
  - "GitHub"
source: "github"
issue_number: 4
issue_url: "https://github.com/13463329124/feiyi/issues/4"
---

​
首先把自己修改的代码提交到分支上，（此时提交推送后，去和master合并会产生冲突）

那么如何解决这个master合并冲突呢？

1.提交前，首先把master拉到最新状态

2.然后基于master新建一个新的分支

3.把修改代码的分支合并到新的分支上

4.最后把这个新的分支提交并推送到远端，然后在去请求合并到master就可以

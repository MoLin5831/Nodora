# 一致性检查模板

使用 `project_template/reviews/version_consistency_check.md` 和 `project_template/reviews/post_fill_consistency_check.md`。

## 检查顺序

```text
1. 主策划案是否为唯一事实源。
2. 岗位版本是否新增了主策划案没有的规则。
3. 岗位版本是否遗漏不可妥协项。
4. 待确认问题状态是否一致。
5. 开发前必须确认项是否仍有阻塞。
6. 任务单是否改变原意。
```

## 严重度

```text
P0：改变设计原意、导致无法开发或验收。
P1：可能造成岗位理解偏差。
P2：表达不清或文件状态不同步。
P3：可后续优化的阅读问题。
```


export interface DesktopBridgeErrorLocalization {
  matched: boolean;
  original: string;
  message: string;
  ruleId: string;
}

interface DesktopBridgeErrorRule {
  id: string;
  pattern: RegExp;
  message: string;
}

const desktopBridgeErrorRules: DesktopBridgeErrorRule[] = [
  {
    id: "project-root-required",
    pattern: /Project root is required/i,
    message: "请输入项目根目录路径。",
  },
  {
    id: "project-root-resolve",
    pattern: /Failed to resolve project root/i,
    message: "无法解析项目根目录，请确认路径存在且可访问。",
  },
  {
    id: "project-root-directory",
    pattern: /Project root must be a directory/i,
    message: "项目根路径必须是一个文件夹。",
  },
  {
    id: "directory-entry-type",
    pattern: /Failed to read directory entry type/i,
    message: "读取目录条目类型失败，请检查文件夹权限。",
  },
  {
    id: "directory-entry",
    pattern: /Failed to read directory entry/i,
    message: "读取目录条目失败，请检查文件夹权限。",
  },
  {
    id: "directory-read",
    pattern: /Failed to read directory/i,
    message: "读取目录失败，请确认项目目录可访问。",
  },
  {
    id: "project-tree-large",
    pattern: /Project tree is too large/i,
    message: "项目目录过大，当前文件树预览最多读取 2000 个条目。",
  },
  {
    id: "relative-path-required",
    pattern: /Relative path is required/i,
    message: "缺少相对文件路径。",
  },
  {
    id: "relative-path-absolute",
    pattern: /Relative path cannot be absolute/i,
    message: "文件路径必须是项目内的相对路径。",
  },
  {
    id: "relative-path-escape",
    pattern: /Relative path cannot leave the selected project root/i,
    message: "文件路径不能离开当前项目根目录。",
  },
  {
    id: "project-file-resolve",
    pattern: /Failed to resolve project file/i,
    message: "无法定位项目内文件，请确认文件存在。",
  },
  {
    id: "project-file-outside-root",
    pattern: /Resolved file is outside the selected project root/i,
    message: "目标文件不在当前项目根目录内，已阻止访问。",
  },
  {
    id: "project-file-not-file",
    pattern: /Resolved path must be a file/i,
    message: "目标路径必须是文件。",
  },
  {
    id: "writable-parent-required",
    pattern: /Writable file must have a parent directory/i,
    message: "写入目标缺少父目录。",
  },
  {
    id: "writable-parent-resolve",
    pattern: /Failed to resolve writable parent directory/i,
    message: "无法定位写入目录，请确认目录已存在且可写。",
  },
  {
    id: "writable-parent-outside-root",
    pattern: /Writable file parent is outside the selected project root/i,
    message: "写入目录不在当前项目根目录内，已阻止写入。",
  },
  {
    id: "writable-file-outside-root",
    pattern: /Writable file is outside the selected project root/i,
    message: "写入文件不在当前项目根目录内，已阻止写入。",
  },
  {
    id: "writable-file-not-file",
    pattern: /Writable path must be a file/i,
    message: "写入目标必须是文件，不能是目录。",
  },
  {
    id: "text-file-kind",
    pattern: /Only UTF-8 text project files are supported/i,
    message: "本地文件桥当前只支持 UTF-8 文本文件。",
  },
  {
    id: "text-file-utf8",
    pattern: /Failed to read local text file as UTF-8/i,
    message: "无法按 UTF-8 读取文本文件，请确认文件编码。",
  },
  {
    id: "text-file-metadata",
    pattern: /Failed to read local text file metadata/i,
    message: "读取文本文件元数据失败，请检查文件权限。",
  },
  {
    id: "text-file-write",
    pattern: /Failed to write local text file/i,
    message: "写入本地文本文件失败，请检查目录权限或文件占用状态。",
  },
  {
    id: "binary-file-kind",
    pattern: /Only (?:PDF, Word, and project image assets|project image assets) are supported/i,
    message: "本地二进制读取当前只支持 PDF、Word 和项目内图片资源。",
  },
  {
    id: "binary-file-large",
    pattern: /Local binary file is (?:too large|larger than)/i,
    message: "预览文件过大，当前本地预览不读取超大二进制文件。",
  },
  {
    id: "binary-file-metadata",
    pattern: /Failed to read local binary file metadata/i,
    message: "读取本地图片元数据失败，请检查文件权限。",
  },
  {
    id: "binary-file-read",
    pattern: /Failed to read local binary file/i,
    message: "读取本地图片失败，请检查文件权限。",
  },
  {
    id: "template-conflict",
    pattern: /Template path conflicts with a non-file entry/i,
    message: "Nodora 模板路径与现有目录冲突，请检查 nodora/ 内同名项。",
  },
  {
    id: "nodora-directory-create",
    pattern: /Failed to create Nodora project directory/i,
    message: "创建 nodora/ 工作区目录失败，请检查项目目录写入权限。",
  },
  {
    id: "nodora-directory-resolve",
    pattern: /Failed to resolve Nodora project directory/i,
    message: "无法定位 nodora/ 工作区目录，请检查项目目录权限。",
  },
  {
    id: "nodora-directory-outside-root",
    pattern: /Nodora project directory is outside the selected project root/i,
    message: "nodora/ 工作区不在当前项目根目录内，已阻止写入。",
  },
  {
    id: "template-parent-outside-root",
    pattern: /Template file parent is outside the selected project root/i,
    message: "模板文件父目录不在当前项目根目录内，已阻止写入。",
  },
  {
    id: "template-write",
    pattern: /Failed to write Nodora template file/i,
    message: "写入 Nodora 模板文件失败，请检查项目目录写入权限。",
  },
  {
    id: "desktop-backend-unavailable",
    pattern: /Desktop backend is unavailable/i,
    message: "桌面后端不可用，请确认正在使用 Tauri 桌面版。",
  },
  {
    id: "invalid-utf8",
    pattern: /stream did not contain valid UTF-8|invalid utf-?8|not valid UTF-8/i,
    message: "文件不是有效的 UTF-8 文本，请确认编码后再打开。",
  },
  {
    id: "access-denied",
    pattern: /Access is denied|Permission denied|拒绝访问|os error 5/i,
    message: "没有访问权限，请检查文件夹权限或文件是否被系统占用。",
  },
  {
    id: "path-not-found",
    pattern: /The system cannot find the path specified|No such file or directory|path not found|os error 3/i,
    message: "路径不存在，请确认项目目录或文件路径仍然有效。",
  },
  {
    id: "file-not-found",
    pattern: /The system cannot find the file specified|file not found|os error 2/i,
    message: "文件不存在，请刷新项目树后重试。",
  },
  {
    id: "tauri-invoke",
    pattern: /Failed to invoke|invoke/i,
    message: "调用桌面后端失败，请重试或确认桌面版后端状态。",
  },
  {
    id: "tauri-arguments",
    pattern: /Failed to deserialize|invalid args|missing field/i,
    message: "桌面后端参数格式不匹配，请刷新应用后重试。",
  },
];

export function describeDesktopBridgeError(message: string): DesktopBridgeErrorLocalization {
  const original = message.trim();

  for (const rule of desktopBridgeErrorRules) {
    if (rule.pattern.test(original)) {
      return {
        matched: true,
        original,
        message: rule.message,
        ruleId: rule.id,
      };
    }
  }

  return {
    matched: false,
    original,
    message: original,
    ruleId: "unknown",
  };
}

export function localizeDesktopBridgeError(message: string): string {
  const localized = describeDesktopBridgeError(message);
  if (!localized.matched) {
    return localized.original;
  }

  return `${localized.message}（原始错误：${localized.original}）`;
}

export function errorText(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return localizeDesktopBridgeError(raw);
}

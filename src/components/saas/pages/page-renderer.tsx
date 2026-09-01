import type { CSSProperties } from "react";
import type { PageTreeNode } from "@/lib/saas/page-builder/build-tree";

/**
 * Turns a Page Schema (the same tree the Editor edits) into real HTML —
 * the runtime rendering layer, deliberately separate from the Editor's own
 * canvas UI (see AGENTS.md Phase 3A). Used by the in-editor Preview tab
 * today; a future publish route would reuse this same component unchanged.
 */
export function PageRenderer({ node }: { node: PageTreeNode }) {
  const style = node.styles as CSSProperties;
  const children = node.children.map((child) => <PageRenderer key={child.id} node={child} />);

  switch (node.type) {
    case "ROOT":
    case "CONTAINER":
    case "SECTION":
      return <div style={style}>{children}</div>;

    case "STACK": {
      const direction = node.props.direction === "row" ? "row" : "column";
      return (
        <div style={{ display: "flex", flexDirection: direction, ...style }}>
          {children}
        </div>
      );
    }

    case "GRID": {
      const columns = Number(node.props.columns) || 2;
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, ...style }}>{children}</div>
      );
    }

    case "TEXT":
      return <p style={style}>{String(node.props.text ?? "")}</p>;

    case "HEADING": {
      const level = String(node.props.level ?? "2");
      const text = String(node.props.text ?? "");
      switch (level) {
        case "1":
          return <h1 style={style}>{text}</h1>;
        case "3":
          return <h3 style={style}>{text}</h3>;
        case "4":
          return <h4 style={style}>{text}</h4>;
        default:
          return <h2 style={style}>{text}</h2>;
      }
    }

    case "IMAGE":
      // eslint-disable-next-line @next/next/no-img-element -- component library, not a Next-managed static asset
      return <img src={String(node.props.src ?? "")} alt={String(node.props.alt ?? "")} style={style} />;

    case "BUTTON":
      return (
        <a
          href={String(node.props.href ?? "#")}
          style={{
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: "6px",
            background: "#4f46e5",
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
            ...style,
          }}
        >
          {String(node.props.text ?? "")}
        </a>
      );

    case "SPACER":
      return <div style={{ height: `${Number(node.props.height) || 24}px`, ...style }} />;

    case "DIVIDER":
      return <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", ...style }} />;

    default:
      return null;
  }
}

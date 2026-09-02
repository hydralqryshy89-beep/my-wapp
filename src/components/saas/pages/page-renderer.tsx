import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { PageTreeNode } from "@/lib/saas/page-builder/build-tree";

export type WrapNode = (node: PageTreeNode, rendered: ReactNode) => ReactNode;

function renderElement(node: PageTreeNode, children: ReactNode): ReactNode {
  const style = node.styles as CSSProperties;

  switch (node.type) {
    case "ROOT":
    case "CONTAINER":
    case "SECTION":
      return <div style={style}>{children}</div>;

    case "STACK": {
      const direction = node.props.direction === "row" ? "row" : "column";
      return <div style={{ display: "flex", flexDirection: direction, ...style }}>{children}</div>;
    }

    case "GRID": {
      const columns = Number(node.props.columns) || 2;
      return <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, ...style }}>{children}</div>;
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

function renderWithWrap(node: PageTreeNode, wrap?: WrapNode): ReactNode {
  const children = node.children.map((child) => <Fragment key={child.id}>{renderWithWrap(child, wrap)}</Fragment>);
  const element = renderElement(node, children);
  return wrap ? wrap(node, element) : element;
}

/**
 * Turns a Page Schema (the same tree the Editor edits) into real HTML — the
 * one runtime rendering layer shared by the in-editor visual Canvas and the
 * standalone Preview. `wrap`, when given, lets a caller decorate every
 * rendered node (selection outline, hover, drag handles, drop zones)
 * without this component knowing anything about editing — omit it and this
 * is exactly the clean, editor-free Preview/Runtime renderer.
 */
export function PageRenderer({ node, wrap }: { node: PageTreeNode; wrap?: WrapNode }) {
  return <>{renderWithWrap(node, wrap)}</>;
}

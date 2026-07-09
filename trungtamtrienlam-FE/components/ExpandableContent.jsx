"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Form";

export default function ExpandableContent({
  label = "Nội dung:",
  content,
  className = "",
  isCol = false,
  id = "",
  colorLabel = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      // So sánh chiều cao thực tế và chiều cao hiển thị tối đa của 3 dòng
      const isOverflowing = el.scrollHeight > el.clientHeight + 1;
      setIsClamped(isOverflowing);
    }
  }, [content]);

  useEffect(() => {
    if (id.length > 0) {
      const el = document.getElementById(id);
      if (el) {
        const element = el.getElementsByClassName("content-scroll")[0];
        if (element) {
          let style = window.getComputedStyle(element);
          let padding = style.getPropertyValue("padding");
          contentRef.current.style.maxWidth = `${
            el.clientWidth - (parseInt(padding) + 20)
          }px`;
        }
      }
    }
  }, [id]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className={`flex justify-center items-start gap-2 ${
          isCol ? " flex-col " : " "
        } `}
      >
        {label.length > 0 && (
          <b className={`flex-shrink-0 ${colorLabel}`}>{label}</b>
        )}
        <div
          ref={contentRef}
          className={`overflow-x-auto text-sm text-gray-800 flex-grow transition-all duration-300 ${
            !isExpanded ? "line-clamp-3" : ""
          }`}
          dangerouslySetInnerHTML={{
            __html: content
              ?.replace(/<div>/g, "<span>")
              .replace(/<\/div>/g, "</span>"),
          }}
        />
      </div>

      {isClamped && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 h-auto"
          >
            {isExpanded ? "Thu gọn" : "Xem thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}

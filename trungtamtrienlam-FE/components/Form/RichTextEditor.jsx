"use client"

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import {
  Bold, Italic, Underline, List, ListOrdered, Undo, Redo,
  Image as ImageIcon, Columns, AlignLeft, AlignCenter, AlignRight, Link, ChevronDown, Type
} from "lucide-react"
import ModalLink from "./ModalLink"

const RichTextEditor = forwardRef(({
  id,
  name,
  value = "",
  onChange,
  onInsertTempImage,
  onRemoveTempImage,
  disabled = false,
  readOnly = false,
  className = "",
  error = false,
  errorMessage = "",
  minHeight = 200,
  showImageTools = false,
  ...rest
}, ref) => {
  const editorRef = useRef(null)
  const [initialContent, setInitialContent] = useState(value)
  const isUserTyping = useRef(false)
  const [showHeadingMenu, setShowHeadingMenu] = useState(false)
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false)
  const [fontColor, setFontColor] = useState("#000000")
  const [showLink, setShowLink] = useState(false)
  const [savedRange, setSavedRange] = useState(null)

  const handleModalActive = () => {
    if (!showLink) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        setSavedRange(sel.getRangeAt(0)) // Lưu vùng chọn hiện tại
      }
    }
    setShowLink(!showLink)
  }

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current
  }))

  useEffect(() => {
    document.execCommand("defaultParagraphSeparator", false, "div")
    ensureParagraph()
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === 1 && node.tagName === "IMG") {
            const tempId = node.getAttribute("data-temp-id")
            if (tempId && !editor.querySelector(`img[data-temp-id="${tempId}"]`)) {
              onRemoveTempImage?.(tempId)
            }
          }
          if (node.querySelectorAll) {
            node.querySelectorAll("img[data-temp-id]").forEach(img => {
              const tempId = img.getAttribute("data-temp-id")
              if (tempId && !editor.querySelector(`img[data-temp-id="${tempId}"]`)) {
                onRemoveTempImage?.(tempId)
              }
            })
          }
        })
      })
    })
    observer.observe(editor, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [onRemoveTempImage])

  useEffect(() => {
    if (editorRef.current && !isUserTyping.current) {
      const currentHTML = editorRef.current.innerHTML?.trim()
      const newHTML = (value || "").trim()
      if (currentHTML !== newHTML) {
        editorRef.current.innerHTML = newHTML
        setInitialContent(newHTML)
      }
    }
  }, [value])

  // const ensureParagraph = () => {
  //   const editor = editorRef.current
  //   if (!editor) return
  //   if (editor.innerHTML.trim() === "") {
  //     const p = document.createElement("p")
  //     p.innerHTML = "<br>"
  //     editor.appendChild(p)
  //     const range = document.createRange()
  //     const sel = window.getSelection()
  //     range.setStart(p, 0)
  //     range.collapse(true)
  //     sel.removeAllRanges()
  //     sel.addRange(range)
  //   }
  // }

  const ensureParagraph = () => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML.trim() === "") {
      // Không thêm gì hết, để rỗng hoàn toàn
      editor.innerHTML = ""
    }
  }


  const handleContentChange = () => {
    if (!editorRef.current) return
    isUserTyping.current = true

    const wrappers = editorRef.current.querySelectorAll(".resizable-wrapper")
    wrappers.forEach(w => {
      const img = w.querySelector("img")
      if (img) {
        if (w.style.width) img.style.width = w.style.width
        if (w.style.height) img.style.height = w.style.height
        w.parentNode.replaceChild(img, w)
      }
    })

    let content = editorRef.current.innerHTML
    if (content === "<p><br></p>" || content === "<br>" || content.trim() === "") {
      content = ""
      editorRef.current.innerHTML = ""
    }

    if (content !== initialContent) {
      onChange?.({ target: { name, value: content } })
      setInitialContent(content)
    }

    setTimeout(() => { isUserTyping.current = false }, 200)
    ensureParagraph()
  }

  const formatText = (command, value = null) => {
    document.execCommand(command, false, value)
    handleContentChange()
  }

  const resizeImage = (file, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          let width = img.width
          let height = img.height
          if (width > maxWidth || height > maxHeight) {
            const scale = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * scale)
            height = Math.round(height * scale)
          }
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL(file.type, 0.9))
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const insertNodeAtCaret = (node) => {
    const sel = window.getSelection()
    const editor = editorRef.current
    if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const frag = document.createDocumentFragment()
      frag.appendChild(node)
      range.insertNode(frag)
      range.setStartAfter(node)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else if (editor) {
      editor.appendChild(node)
      const range = document.createRange()
      range.setStartAfter(node)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  const makeImageResizable = (img) => {
    const oldWrappers = editorRef.current.querySelectorAll(".resizable-wrapper")
    oldWrappers.forEach(w => {
      const innerImg = w.querySelector("img")
      if (innerImg) w.parentNode.replaceChild(innerImg, w)
    })

    const wrapper = document.createElement("div")
    wrapper.className = "resizable-wrapper"
    wrapper.style.position = "relative"
    wrapper.style.display = "inline-block"
    wrapper.style.border = "1px dashed #aaa"
    wrapper.contentEditable = "false"

    img.style.width = img.width + "px"
    img.style.height = "auto"
    img.style.display = "block"

    img.parentNode.insertBefore(wrapper, img)
    wrapper.appendChild(img)

    const createHandle = (cursor, left, top) => {
      const handle = document.createElement("div")
      handle.style.cssText = `
        position:absolute;width:10px;height:10px;
        background:blue;cursor:${cursor};left:${left};top:${top};
      `
      wrapper.appendChild(handle)

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault()
        const startX = e.clientX
        const startY = e.clientY
        const startWidth = img.offsetWidth
        const startHeight = img.offsetHeight

        const doDrag = (e) => {
          img.style.width = startWidth + (e.clientX - startX) + "px"
          img.style.height = startHeight + (e.clientY - startY) + "px"
        }

        const stopDrag = () => {
          document.removeEventListener("mousemove", doDrag)
          document.removeEventListener("mouseup", stopDrag)
          if (wrapper.parentNode) wrapper.parentNode.replaceChild(img, wrapper)
          handleContentChange()
        }

        document.addEventListener("mousemove", doDrag)
        document.addEventListener("mouseup", stopDrag)
      })
    }

    createHandle("nwse-resize", "-5px", "-5px")
    createHandle("nesw-resize", "calc(100% - 5px)", "-5px")
    createHandle("nesw-resize", "-5px", "calc(100% - 5px)")
    createHandle("nwse-resize", "calc(100% - 5px)", "calc(100% - 5px)")
  }

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.tagName === "IMG") {
        makeImageResizable(e.target)
      } else {
        const oldWrappers = editorRef.current?.querySelectorAll(".resizable-wrapper") || []
        oldWrappers.forEach(w => {
          const innerImg = w.querySelector("img")
          if (innerImg) w.parentNode.replaceChild(innerImg, w)
        })
      }
    }
    const editor = editorRef.current
    if (editor) editor.addEventListener("click", handleClick)
    return () => { if (editor) editor.removeEventListener("click", handleClick) }
  }, [])

  const alignBlock = (alignment) => {
    const sel = window.getSelection()
    if (!sel.rangeCount) return
    const node = sel.anchorNode
    let targetEl = null
    if (node.nodeType === 1) targetEl = node.closest("img, p, div, h1, h2, h3, h4, h5")
    else if (node.parentElement) targetEl = node.parentElement.closest("img, p, div, h1, h2, h3, h4, h5")
    if (targetEl) {
      if (targetEl.tagName === "IMG") {
        targetEl.style.display = "block"
        if (alignment === "left") targetEl.style.margin = "0 auto 0 0"
        if (alignment === "center") targetEl.style.margin = "0 auto"
        if (alignment === "right") targetEl.style.margin = "0 0 0 auto"
      } else {
        targetEl.style.textAlign = alignment
      }
      handleContentChange()
    }
  }

  const createTempId = () => "temp-" + Date.now() + "-" + Math.floor(Math.random() * 1000)

  const baseClasses = "w-full border rounded-md focus:outline-none transition-colors overflow-auto"
  const normalClasses = "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  const errorClasses = "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
  const disabledClasses = "bg-gray-100 text-gray-500 cursor-not-allowed"
  const editorClasses = `${baseClasses} ${error ? errorClasses : normalClasses} ${disabled ? disabledClasses : ""} ${className}`

  return (
    <>
      <div className="w-full">
        <style jsx>{`
        #${id} h1 { font-size: 2em; font-weight: bold; }
        #${id} h2 { font-size: 1.5em; font-weight: bold; }
        #${id} h3 { font-size: 1.17em; font-weight: bold; }
        #${id} h4 { font-size: 1em; font-weight: bold; }
        #${id} h5 { font-size: 0.83em; font-weight: bold; }
      `}</style>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t-md relative">
          {/* Undo/Redo */}
          <button type="button" onClick={() => formatText("undo")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Undo size={16} /></button>
          <button type="button" onClick={() => formatText("redo")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Redo size={16} /></button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Heading dropdown */}
          <div className="relative">
            <button type="button" disabled={disabled || readOnly}
              onClick={() => setShowHeadingMenu(!showHeadingMenu)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 bg-white border rounded hover:bg-gray-100">
              H <ChevronDown size={14} />
            </button>
            {showHeadingMenu && (
              <div className="absolute mt-1 bg-white border rounded shadow-lg z-10 w-28 max-h-48 overflow-y-auto">
                {["p", "h1", "h2", "h3", "h4", "h5"].map(tag => (
                  <button key={tag} type="button"
                    className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
                    onClick={() => { formatText("formatBlock", `<${tag}>`); setShowHeadingMenu(false) }}>
                    {tag.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font size dropdown */}
          <div className="relative">
            <button type="button" disabled={disabled || readOnly}
              onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-700 bg-white border rounded hover:bg-gray-100">
              <Type size={16} /> <ChevronDown size={14} />
            </button>
            {showFontSizeMenu && (
              <div className="absolute mt-1 bg-white border rounded shadow-lg z-10 w-28 max-h-48 overflow-y-auto">
                {[1, 2, 3, 4, 5, 6, 7].map(size => (
                  <button key={size} type="button"
                    className="block w-full text-left px-3 py-1 hover:bg-gray-100 text-sm"
                    onClick={() => { formatText("fontSize", size); setShowFontSizeMenu(false) }}>
                    Size {size}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font color */}
          <input type="color" value={fontColor}
            disabled={disabled || readOnly}
            onChange={(e) => { setFontColor(e.target.value); formatText("foreColor", e.target.value) }}
            className="w-7 h-7 border rounded cursor-pointer ml-1"
          />

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Bold/Italic/Underline */}
          <button type="button" onClick={() => formatText("bold")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Bold size={16} /></button>
          <button type="button" onClick={() => formatText("italic")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Italic size={16} /></button>
          <button type="button" onClick={() => formatText("underline")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><Underline size={16} /></button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Link */}
          <button type="button" disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"
            onClick={() => { handleModalActive() }}>
            <Link size={16} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* List */}
          <button type="button" onClick={() => formatText("insertUnorderedList")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><List size={16} /></button>
          <button type="button" onClick={() => formatText("insertOrderedList")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><ListOrdered size={16} /></button>

          <div className="w-px h-6 bg-gray-300 mx-1"></div>

          {/* Align */}
          <button type="button" onClick={() => alignBlock("left")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><AlignLeft size={16} /></button>
          <button type="button" onClick={() => alignBlock("center")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><AlignCenter size={16} /></button>
          <button type="button" onClick={() => alignBlock("right")} disabled={disabled || readOnly}
            className="p-1 text-gray-600 hover:bg-gray-200 rounded"><AlignRight size={16} /></button>

          {/* Image tools */}
          {showImageTools && (
            <>
              <div className="w-px h-6 bg-gray-300 mx-1"></div>
              <button type="button" disabled={disabled || readOnly}
                className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.onchange = async (e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const resized = await resizeImage(file)
                      const img = document.createElement("img")
                      img.src = resized
                      img.alt = file.name
                      img.style.maxWidth = "100%"
                      const tempId = createTempId()
                      img.setAttribute("data-temp-id", tempId)
                      insertNodeAtCaret(img)
                      handleContentChange()
                      onInsertTempImage?.(tempId, file)
                    }
                  }
                  input.click()
                }}>
                <ImageIcon size={16} />
              </button>
              <button type="button" disabled={disabled || readOnly}
                className="p-1 text-gray-600 hover:bg-gray-200 rounded"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.multiple = true
                  input.onchange = async (e) => {
                    const files = Array.from(e.target.files)
                    if (files.length === 0) return
                    const resized = await Promise.all(files.slice(0, 4).map(f => resizeImage(f)))
                    const col = resized.length
                    const width = 100 / col
                    const container = document.createElement("div")
                    container.style.cssText = "display:flex; gap:10px; margin:10px 0;"
                    resized.forEach((src, idx) => {
                      const img = document.createElement("img")
                      img.src = src
                      img.style.width = `${width}%`
                      img.style.height = "auto"
                      const tempId = createTempId()
                      img.setAttribute("data-temp-id", tempId)
                      container.appendChild(img)
                      onInsertTempImage?.(tempId, files[idx])
                    })
                    insertNodeAtCaret(container)
                    handleContentChange()
                  }
                  input.click()
                }}>
                <Columns size={16} />
              </button>
            </>
          )}
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          id={id}
          contentEditable={!disabled && !readOnly}
          className={`${editorClasses} rounded-t-none p-3`}
          style={{ minHeight: `${minHeight}px` }}
          onInput={handleContentChange}
          suppressContentEditableWarning={true}
          {...rest}
        />

        {error && errorMessage && <p className="mt-1 text-sm text-red-600">{errorMessage}</p>}
      </div>
      {
        showLink && <ModalLink isOpen={showLink} onClose={handleModalActive} handleSave={formatText} selectionRange={savedRange} />
      }
    </>
  )
})

RichTextEditor.displayName = "RichTextEditor"
export default RichTextEditor

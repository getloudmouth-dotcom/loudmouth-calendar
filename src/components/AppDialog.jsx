import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SANS, MONO, C } from "@/theme";

export default function AppDialog({ open, onClose, title, children, width = 420 }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 32, maxWidth: width,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)", fontFamily: SANS,
        }}
      >
        {title && (
          <DialogHeader>
            <DialogTitle style={{ color: C.text, fontFamily: SANS, fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

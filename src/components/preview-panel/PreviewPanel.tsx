'use client';

import { usePushStore } from '@/stores/usePushStore';
import { useUIStore } from '@/stores/useUIStore';
import { PhoneFrame } from '@/components/layout/PhoneFrame';

export function PreviewPanel() {
  const pushItems = usePushStore((s) => s.pushItems);
  const selectedId = useUIStore((s) => s.selectedPushItemId);
  const activeTab = useUIStore((s) => s.activeTab);

  const selectedItem = pushItems.find((i) => i.id === selectedId);
  const emojiEnabled = activeTab === 'background';

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">实时预览</h2>

      {/* Device indicator */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-gray-400">
          {activeTab === 'foreground' ? '📱 前台 Push 预览' : '📱 后台 Push 预览'}
        </span>
      </div>

      {!selectedItem ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          <p>点击左侧 Push 卡片</p>
          <p>在此预览推送效果</p>
        </div>
      ) : (
        <PhoneFrame>
          <div className="space-y-4">
            {/* Simulated push notification */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              {/* App icon + name */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs">
                  学
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-800">百度网盘学习助手</div>
                  <div className="text-[10px] text-gray-400">刚刚</div>
                </div>
              </div>

              {/* Push title */}
              <div className="text-sm font-semibold text-gray-800 mb-1">
                {emojiEnabled && '📚 '}{selectedItem.title}
              </div>

              {/* Push body */}
              <div className="text-xs text-gray-500 leading-relaxed">
                {selectedItem.body}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400">
                <span className="text-gray-300">人群：</span>
                {selectedItem.audience_name}
              </div>
              <div className="text-xs text-gray-400">
                <span className="text-gray-300">能力：</span>
                {selectedItem.capability_name}
              </div>

              {/* Rule conflicts */}
              {selectedItem.rule_conflicts.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  {selectedItem.rule_conflicts.map((c) => (
                    <div
                      key={c.rule_id}
                      className={`text-xs px-2 py-1 rounded ${
                        c.severity === 'error'
                          ? 'bg-red-50 text-red-600'
                          : c.severity === 'warning'
                            ? 'bg-yellow-50 text-yellow-600'
                            : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {c.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PhoneFrame>
      )}

      {/* Link preview at bottom */}
      {selectedItem && (
        <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
          <div className="text-xs text-gray-400 font-medium">链接预览</div>
          <div className="bg-gray-50 rounded-lg p-2 text-[10px] font-mono text-gray-500 break-all">
            <div className="mb-1"><span className="text-green-500">Android:</span> {selectedItem.android_link}</div>
            <div><span className="text-blue-500">iOS:</span> {selectedItem.ios_link}</div>
          </div>
        </div>
      )}
    </div>
  );
}

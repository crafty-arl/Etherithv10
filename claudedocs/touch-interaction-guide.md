# Touch Interaction Guidelines

## Touch Target Specifications

### Minimum Sizes
- **Buttons**: 44px × 44px minimum (iOS), 48dp × 48dp recommended (Android)
- **Form inputs**: 44px height minimum
- **Links**: 44px × 44px minimum clickable area
- **Toggle switches**: 44px × 24px minimum

### Thumb-Zone Optimization
Mobile screens divided into three zones:
1. **Easy reach** (bottom 1/3): Primary actions, navigation
2. **Difficult reach** (middle 1/3): Secondary actions, content
3. **Hard reach** (top 1/3): Status, dismissible elements

### Spacing Guidelines
- **Between touch targets**: 8px minimum separation
- **Around screen edges**: 16px minimum margin
- **Between related elements**: 4px minimum
- **Between unrelated elements**: 12px minimum

## Gesture Patterns

### Standard Mobile Gestures
```typescript
interface GestureHandlers {
  onSwipeUp: () => void      // Show more options, expand
  onSwipeDown: () => void    // Dismiss, collapse, refresh
  onSwipeLeft: () => void    // Next item, delete action
  onSwipeRight: () => void   // Previous item, back navigation
  onPinch: (scale: number) => void        // Zoom
  onLongPress: () => void    // Context menu, selection
  onDoubleTap: () => void    // Quick action (like, favorite)
}
```

### File Upload Gestures
- **Tap camera button**: Open camera
- **Long press camera**: Show camera options
- **Swipe up on preview**: Show metadata editing
- **Swipe down on preview**: Dismiss and start over
- **Pinch on preview**: Zoom image

### Memory Management Gestures
- **Swipe left on memory**: Quick actions (share, delete)
- **Swipe right on memory**: Mark as favorite
- **Long press memory**: Multi-select mode
- **Pull down on list**: Refresh memories

## Interactive Feedback

### Visual Feedback
```css
/* Touch state styles */
.touch-target {
  transition: transform 0.1s ease, background-color 0.1s ease;
}

.touch-target:active {
  transform: scale(0.98);
  background-color: var(--active-state-color);
}

/* Disabled state */
.touch-target:disabled {
  opacity: 0.6;
  pointer-events: none;
}
```

### Haptic Feedback (iOS)
```typescript
// Light feedback for selection
const lightImpact = new window.HapticFeedback.ImpactFeedbackGenerator({
  style: 'light'
})
lightImpact.impactOccurred()

// Medium feedback for actions
const mediumImpact = new window.HapticFeedback.ImpactFeedbackGenerator({
  style: 'medium'
})
mediumImpact.impactOccurred()

// Heavy feedback for errors or completion
const heavyImpact = new window.HapticFeedback.ImpactFeedbackGenerator({
  style: 'heavy'
})
heavyImpact.impactOccurred()
```

### Audio Feedback
- **Success actions**: Subtle chime
- **Error states**: Error sound
- **Navigation**: Click sound
- **Photo capture**: Shutter sound

## Form Interaction Patterns

### Mobile-Optimized Forms
```typescript
interface MobileFormProps {
  autoFocus?: boolean        // Focus first field automatically
  validateOnBlur?: boolean   // Validate as user progresses
  showProgress?: boolean     // Show completion progress
  enableAutoComplete?: boolean // Suggest previous entries
}
```

### Input Types
- **File upload**: Use native file picker with camera option
- **Text input**: Show appropriate keyboard type
- **Number input**: Show numeric keypad
- **Email input**: Show email keyboard
- **Search input**: Show search keyboard with search button

### Keyboard Handling
```typescript
// Keyboard event handlers
const handleKeyboardShow = () => {
  // Adjust viewport, scroll to focused input
  document.body.classList.add('keyboard-open')
}

const handleKeyboardHide = () => {
  // Restore viewport
  document.body.classList.remove('keyboard-open')
}
```

## Performance Considerations

### Touch Response Time
- **Target**: Under 100ms response to touch
- **Perceived performance**: Visual feedback within 16ms
- **Maximum acceptable**: 300ms for complex operations

### Gesture Recognition
```typescript
// Optimized gesture detection
const gestureThresholds = {
  swipeMinDistance: 50,      // Minimum distance for swipe
  swipeMaxTime: 300,         // Maximum time for swipe
  longPressTime: 500,        // Time for long press
  doubleTapMaxDelay: 300     // Max delay between taps
}
```

### Memory Management
- **Remove event listeners**: Clean up on component unmount
- **Debounce rapid gestures**: Prevent accidental double-actions
- **Cancel ongoing gestures**: When component state changes

## Accessibility for Touch

### Screen Reader Support
```typescript
// Touch accessibility attributes
interface TouchA11yProps {
  role: string
  'aria-label': string
  'aria-describedby'?: string
  'aria-pressed'?: boolean    // For toggle buttons
  'aria-expanded'?: boolean   // For expandable elements
}
```

### Alternative Input Methods
- **Voice control**: Support voice commands
- **Switch control**: Support external switches
- **Assistive touch**: Ensure compatibility
- **Keyboard navigation**: Fallback for all touch actions

## Testing Guidelines

### Device Testing
- **Physical devices**: Test on actual mobile devices
- **Orientation testing**: Both portrait and landscape
- **Various screen sizes**: Different device classes
- **Network conditions**: Test on slow connections

### Touch Testing Checklist
- [ ] All touch targets meet minimum size requirements
- [ ] Touch targets have adequate spacing
- [ ] Visual feedback is immediate and clear
- [ ] Gestures work consistently across devices
- [ ] Long press doesn't interfere with scrolling
- [ ] Swipe gestures don't conflict with native gestures
- [ ] Form inputs trigger correct keyboards
- [ ] Accessibility features work with touch

## Implementation Example

```typescript
// Touch-optimized button component
export const TouchButton: React.FC<TouchButtonProps> = ({
  onPress,
  onLongPress,
  haptic = 'light',
  children,
  ...props
}) => {
  const handleTouchStart = useCallback(() => {
    // Provide immediate visual feedback
    setIsPressed(true)

    // Trigger haptic feedback
    if (haptic && 'hapticFeedback' in navigator) {
      navigator.hapticFeedback.vibrate(haptic)
    }
  }, [haptic])

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false)
    onPress?.()
  }, [onPress])

  const handleLongPress = useCallback(() => {
    onLongPress?.()

    // Stronger haptic for long press
    if ('hapticFeedback' in navigator) {
      navigator.hapticFeedback.vibrate('medium')
    }
  }, [onLongPress])

  return (
    <button
      className={`touch-button ${isPressed ? 'pressed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleLongPress}
      {...props}
    >
      {children}
    </button>
  )
}
```
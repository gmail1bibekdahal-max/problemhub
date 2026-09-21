'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  List,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
  BarChart3,
  X,
  LogOut,
  Zap,
  ThumbsUp,
  Smile,
  Image as ImageIcon,
  MoreHorizontal,
  ChevronDown,
  Globe,
  Mail,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'

type CommentItem = {
  id: string
  userId?: string
  user: string
  initials?: string
  accent?: string
  text: string
  time: string
  likes?: number
  liked?: boolean
  isOp?: boolean
  parentId?: string | null
  replies?: CommentItem[]
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return 'recently'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (isNaN(diffMs)) return 'recently'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

type SponsoredProduct = {
  name: string
  description: string
  className: string
  mark: string
  url?: string
}

type Problem = {
  id: string
  userId?: string
  user: string
  initials: string
  time: string
  category: string
  categoryClass: string
  title: string
  paragraphs: string[]
  frequency: string
  timeWasted: string
  currentSolution: string
  impact: string
  impactDetail?: string
  lookingFor: string[]
  comments: number
  people: number
  accent: string
  saved?: boolean
  commentsList?: CommentItem[]
  problemVotes?: number
  solutionVotes?: number
  userVotedProblem?: boolean
  userVotedSolution?: boolean
}

function getClientVoterId(): string {
  if (typeof window === 'undefined') return 'guest_default'
  try {
    let id = localStorage.getItem('problemhub_voter_id')
    if (!id) {
      id = `voter_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem('problemhub_voter_id', id)
    }
    return id
  } catch {
    return 'guest_default'
  }
}

function getLocalReactions(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('problemhub_local_reactions')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalReaction(problemId: string, type: 'problem' | 'solution', active: boolean) {
  if (typeof window === 'undefined') return
  try {
    const pKey = `${problemId}:problem`
    const sKey = `${problemId}:solution`
    const current = getLocalReactions()
    if (active) {
      if (type === 'problem') {
        current[pKey] = true
        delete current[sKey]
      } else {
        current[sKey] = true
        delete current[pKey]
      }
    } else {
      delete current[pKey]
      delete current[sKey]
    }
    localStorage.setItem('problemhub_local_reactions', JSON.stringify(current))
  } catch {}
}

const reflectionPrompts = [
  'What\'s frustrating you?',
  'What takes too long?',
  'What do you do manually?',
  'What has no good solution?',
  'What do you wish were easier?',
]


function Logo({ onRefresh }: { onRefresh?: () => void }) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (onRefresh) {
      onRefresh()
    }
  }

  return (
    <a
      href="/"
      className="logo"
      onClick={handleClick}
      title="ProblemHub - Refresh and go to top"
      aria-label="ProblemHub Home"
    >
      <img
        src="/ProblemHub Full logo.png"
        alt="ProblemHub"
        className="logo-full-img"
        width={186}
        height={62}
      />
    </a>
  )
}

function Avatar({ problem }: { problem: Problem }) {
  return <div className={`avatar ${problem.accent}`}>{problem.initials}</div>
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="action-button" onClick={onClick}>
      {children}
    </button>
  )
}

function ProblemCard({
  problem,
  onToggleSave,
  onShare,
  onAddComment,
  onToggleLikeComment,
  onToggleReaction,
  user,
}: {
  problem: Problem
  onToggleSave: (id: string) => void
  onShare: (problem: Problem) => void
  onAddComment: (id: string, text: string, parentId?: string | null) => void
  onToggleLikeComment: (problemId: string, commentId: string) => void
  onToggleReaction: (problemId: string, type: 'problem' | 'solution') => void
  user: { id: string; email?: string | null } | null
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSort, setCommentSort] = useState<'top' | 'newest'>('top')
  const [replyingTo, setReplyingTo] = useState<{ id: string; user: string } | null>(null)


  const userHandle = (user?.email?.split('@')[0] || '').toLowerCase()
  const isMyPost = Boolean(user && (problem.userId === user.id || problem.user.toLowerCase() === userHandle))
  const isMyReply = Boolean(
    user &&
      problem.commentsList?.some(
        (c) =>
          c.userId === user.id ||
          c.user.toLowerCase() === userHandle ||
          c.replies?.some((r) => r.userId === user.id || r.user.toLowerCase() === userHandle)
      )
  )

  const totalCommentsCount = useMemo(() => {
    if (!problem.commentsList) return problem.comments || 0
    let count = 0
    for (const c of problem.commentsList) {
      count += 1
      if (c.replies) count += c.replies.length
    }
    return count
  }, [problem.commentsList, problem.comments])

  const sortedComments = useMemo(() => {
    if (!problem.commentsList) return []
    const list = [...problem.commentsList]
    if (commentSort === 'top') {
      return list.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    }
    return list
  }, [problem.commentsList, commentSort])

  function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentDraft.trim()) return
    onAddComment(problem.id, commentDraft.trim(), replyingTo ? replyingTo.id : null)
    setCommentDraft('')
    setReplyingTo(null)
  }

  function handleStartReply(parentId: string, username: string) {
    setReplyingTo({ id: parentId, user: username })
    setCommentDraft((prev) => (prev.startsWith(`@${username} `) ? prev : `@${username} `))
  }

  function appendEmoji(emoji: string) {
    setCommentDraft((prev) => `${prev} ${emoji}`.trim())
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = copyRef.current
    if (!el) return

    if (isExpanded) return

    const check = () => {
      if (!copyRef.current) return
      const isClamped = copyRef.current.scrollHeight > copyRef.current.clientHeight + 4
      setHasOverflow(isClamped)
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [problem.paragraphs, problem.title, isExpanded])

  return (
    <article className="problem-card" id={`problem-${problem.id}`}>
      <div className="problem-header">
        <div className="user-row">
          <Avatar problem={problem} />
          <div>
            <strong>{problem.user}</strong>
            <span>{problem.time}</span>
          </div>
        </div>
        <div className="header-actions">
          {isMyPost && <span className="user-badge my-post-badge">Your Post</span>}
          {!isMyPost && isMyReply && <span className="user-badge my-reply-badge">You Replied</span>}
          <span className={`category ${problem.categoryClass}`}>{problem.category}</span>
          <button className="more" aria-label="More options" type="button">•••</button>
        </div>
      </div>
      <h2
        onClick={() => {
          if (hasOverflow) setIsExpanded((prev) => !prev)
        }}
        style={{ cursor: hasOverflow ? 'pointer' : 'default' }}
        title={hasOverflow ? (isExpanded ? 'Click to show less' : 'Click to see full post') : undefined}
      >
        {problem.title}
      </h2>
      <div
        ref={copyRef}
        className={`problem-copy ${!isExpanded ? 'clamped' : 'expanded'} ${hasOverflow ? 'clickable' : ''}`}
        onClick={() => {
          if (hasOverflow) setIsExpanded((prev) => !prev)
        }}
        title={hasOverflow ? (isExpanded ? 'Click to show less' : 'Click to see full post') : undefined}
      >
        {problem.paragraphs.map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
      {hasOverflow && (
        <button
          type="button"
          className="see-more-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((prev) => !prev)
          }}
        >
          {isExpanded ? 'See less' : '... See more'}
        </button>
      )}

      {/* Structured Stats Vertical List */}
      {(problem.frequency || problem.timeWasted || problem.currentSolution || problem.impact) && (
        <div className="stats-vertical stats-grid">
          {problem.frequency && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <CalendarDays />
              </div>
              <div className="stat-body">
                <span className="stat-label">Frequency</span>
                <strong className="stat-value">{problem.frequency}</strong>
              </div>
            </div>
          )}
          {problem.timeWasted && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <Clock3 />
              </div>
              <div className="stat-body">
                <span className="stat-label">Time wasted</span>
                <strong className="stat-value">{problem.timeWasted}</strong>
              </div>
            </div>
          )}
          {problem.currentSolution && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <List />
              </div>
              <div className="stat-body">
                <span className="stat-label">Current solution</span>
                <strong className="stat-value">{problem.currentSolution}</strong>
              </div>
            </div>
          )}
          {problem.impact && (
            <div className="stat-row">
              <div className="stat-icon-wrap">
                <BarChart3 />
              </div>
              <div className="stat-body">
                <span className="stat-label">Impact</span>
                <strong className="stat-value">
                  {problem.impact}
                  {problem.impactDetail ? <small>{problem.impactDetail}</small> : null}
                </strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Looking for tags matching screenshot */}
      {problem.lookingFor && problem.lookingFor.length > 0 && (
        <div className="looking">
          <span>Looking for:</span>
          {problem.lookingFor.map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      )}

      <div className="card-footer">
        <div className="footer-actions">
          <div className="footer-primary-reactions">
            <button
              type="button"
              className={`reaction-button reaction-problem ${problem.userVotedProblem ? 'active' : ''}`}
              onClick={() => onToggleReaction(problem.id, 'problem')}
              title={problem.userVotedProblem ? 'You flagged this problem (Click to undo)' : 'I have this problem too'}
              aria-label="I have this problem too"
              aria-pressed={problem.userVotedProblem}
            >
              <HelpCircle />
              <span>Problem</span>
              <span className="reaction-count">{problem.problemVotes ?? 0}</span>
            </button>

            <button
              type="button"
              className={`reaction-button reaction-solution ${problem.userVotedSolution ? 'active' : ''}`}
              onClick={() => onToggleReaction(problem.id, 'solution')}
              title={problem.userVotedSolution ? 'You offered a solution (Click to undo)' : 'I have / propose a solution'}
              aria-label="I have or build a solution"
              aria-pressed={problem.userVotedSolution}
            >
              <Lightbulb />
              <span>Solution</span>
              <span className="reaction-count">{problem.solutionVotes ?? 0}</span>
            </button>
          </div>

          <div className="footer-secondary-actions">
            <ActionButton onClick={() => setShowComments((prev) => !prev)}>
              <MessageCircle /> <span>{totalCommentsCount} {totalCommentsCount === 1 ? 'comment' : 'comments'}</span>
            </ActionButton>
            <ActionButton onClick={() => onToggleSave(problem.id)}>
              <Bookmark fill={problem.saved ? 'currentColor' : 'none'} /> <span>{problem.saved ? 'Saved' : 'Save'}</span>
            </ActionButton>
            <ActionButton onClick={() => onShare(problem)}>
              <Share2 /> <span>Share</span>
            </ActionButton>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="linkedin-comments-panel">
          {/* 1. LinkedIn Top Compose Box */}
          <form className="linkedin-compose-box" onSubmit={handleCommentSubmit}>
            {replyingTo && (
              <div className="linkedin-replying-badge">
                <span>Replying to <strong>@{replyingTo.user}</strong></span>
                <button
                  type="button"
                  className="replying-cancel-btn"
                  onClick={() => setReplyingTo(null)}
                  title="Cancel reply"
                >
                  <X />
                </button>
              </div>
            )}
            <div className="linkedin-input-row">
              <div className="linkedin-compose-avatar">
                {(user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="linkedin-input-pill">
                <input
                  type="text"
                  placeholder={replyingTo ? `Add a reply to @${replyingTo.user}...` : "Add a comment..."}
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                />
                <div className="linkedin-input-tools">
                  <button type="button" className="linkedin-tool-btn" onClick={() => appendEmoji('😊')} title="Add emoji">
                    <Smile />
                  </button>
                  <span className="linkedin-gif-btn" onClick={() => appendEmoji('🚀')}>GIF</span>
                  <button type="button" className="linkedin-tool-btn" title="Add media">
                    <ImageIcon />
                  </button>
                  {commentDraft.trim() && (
                    <button type="submit" className="linkedin-post-btn">
                      Post
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* 2. LinkedIn Sort Line: "Most relevant ▾" */}
          <div className="linkedin-filter-row">
            <button
              type="button"
              className="linkedin-filter-btn"
              onClick={() => setCommentSort((s) => (s === 'top' ? 'newest' : 'top'))}
            >
              <span>{commentSort === 'top' ? 'Most relevant' : 'Most recent'}</span>
              <ChevronDown />
            </button>
          </div>

          {/* 3. LinkedIn Comments List */}
          <div className="linkedin-comments-list">
            {sortedComments.length > 0 ? (
              sortedComments.map((c) => (
                <div key={c.id} className="linkedin-comment-thread">
                  <div className="linkedin-comment-item">
                    <div className={`linkedin-avatar ${c.accent || 'avatar-blue'}`}>
                      {c.initials || (c.user[0] || 'U').toUpperCase()}
                    </div>
                    <div className="linkedin-comment-bubble-wrap">
                      <div className="linkedin-comment-bubble">
                        <div className="linkedin-bubble-header">
                          <div className="linkedin-author-info">
                            <div className="linkedin-name-row">
                              <strong className="linkedin-author-name">{c.user}</strong>
                              {(c.isOp || c.user.toLowerCase() === problem.user.toLowerCase()) && (
                                <span className="linkedin-op-badge">Author</span>
                              )}
                            </div>
                          </div>
                          <div className="linkedin-time-more">
                            <span className="linkedin-time">{c.time}</span>
                            <button type="button" className="linkedin-more-btn" aria-label="More options">
                              <MoreHorizontal />
                            </button>
                          </div>
                        </div>
                        <p className="linkedin-comment-text">{c.text}</p>
                      </div>

                      {/* Reactions bar */}
                      <div className="linkedin-reaction-bar">
                        <button
                          type="button"
                          className={`linkedin-action-btn ${c.liked ? 'liked' : ''}`}
                          onClick={() => onToggleLikeComment(problem.id, c.id)}
                        >
                          <ThumbsUp />
                          <span>{c.likes && c.likes > 0 ? c.likes : 'Like'}</span>
                        </button>
                        <span className="linkedin-action-sep">|</span>
                        <button
                          type="button"
                          className="linkedin-action-btn"
                          onClick={() => handleStartReply(c.id, c.user)}
                        >
                          <MessageSquare />
                          <span>Reply</span>
                        </button>
                        {c.likes && c.likes > 0 ? (
                          <div className="linkedin-badge-corner" title={`${c.likes} likes`}>
                            <span className="linkedin-thumbsup-badge">👍</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Threaded Nested Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="linkedin-replies-nest">
                      {c.replies.map((reply) => (
                        <div key={reply.id} className="linkedin-comment-item reply-item">
                          <div className={`linkedin-avatar avatar-sm ${reply.accent || 'avatar-blue'}`}>
                            {reply.initials || (reply.user[0] || 'U').toUpperCase()}
                          </div>
                          <div className="linkedin-comment-bubble-wrap">
                            <div className="linkedin-comment-bubble">
                              <div className="linkedin-bubble-header">
                                <div className="linkedin-author-info">
                                  <div className="linkedin-name-row">
                                    <strong className="linkedin-author-name">{reply.user}</strong>
                                    {(reply.isOp || reply.user.toLowerCase() === problem.user.toLowerCase()) && (
                                      <span className="linkedin-op-badge">Author</span>
                                    )}
                                  </div>
                                </div>
                                <div className="linkedin-time-more">
                                  <span className="linkedin-time">{reply.time}</span>
                                  <button type="button" className="linkedin-more-btn" aria-label="More options">
                                    <MoreHorizontal />
                                  </button>
                                </div>
                              </div>
                              <p className="linkedin-comment-text">{reply.text}</p>
                            </div>
                            <div className="linkedin-reaction-bar">
                              <button
                                type="button"
                                className={`linkedin-action-btn ${reply.liked ? 'liked' : ''}`}
                                onClick={() => onToggleLikeComment(problem.id, reply.id)}
                              >
                                <ThumbsUp />
                                <span>{reply.likes && reply.likes > 0 ? reply.likes : 'Like'}</span>
                              </button>
                              <span className="linkedin-action-sep">|</span>
                              <button
                                type="button"
                                className="linkedin-action-btn"
                                onClick={() => handleStartReply(c.id, reply.user)}
                              >
                                <MessageSquare />
                                <span>Reply</span>
                              </button>
                              {reply.likes && reply.likes > 0 ? (
                                <div className="linkedin-badge-corner" title={`${reply.likes} likes`}>
                                  <span className="linkedin-thumbsup-badge">👍</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="comments-empty">
                <MessageSquare style={{ width: 24, height: 24, color: '#087cff' }} />
                <h4>No comments yet</h4>
                <p>Be the first to comment on this problem!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function PostProblemModal({
  onClose,
  onSubmit,
  user,
  onAuth,
}: {
  onClose: () => void
  onSubmit: (problem: Problem) => Promise<void>
  user: { id: string; email?: string | null } | null
  onAuth: (user: { id: string; email?: string | null }) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [frequency, setFrequency] = useState('')
  const [timeWasted, setTimeWasted] = useState('')
  const [currentSolution, setCurrentSolution] = useState('')
  const [impact, setImpact] = useState('')
  const [impactDetail, setImpactDetail] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>([])

  const [authMode, setAuthMode] = useState<'signup' | 'email'>('signup')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  const availableLookingTags = ['advice', 'existing tools', 'build a solution', 'collaborate']

  function toggleLookingTag(tag: string) {
    setLookingFor((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function switchAuthMode(mode: 'signup' | 'email') {
    setAuthMode(mode)
    setAuthError('')
    setAuthMessage('')
  }

  function handleGuestAuth() {
    const guestId = `guest_${Date.now()}`
    onAuth({ id: guestId, email: 'guest@problemhub.local' })
  }

  async function handleGoogleSignUp() {
    setIsLoading(true)
    setAuthError('')
    try {
      const supabase = createClient()
      const redirectUrl = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      })
      if (error) throw error
    } catch (err) {
      console.log('[v0] OAuth error:', err)
      setAuthError('Google sign-in is not enabled in your Supabase project. Use Email or Continue as Guest.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailAuth(event?: React.MouseEvent<HTMLButtonElement>) {
    event?.preventDefault()
    setAuthError('')
    setAuthMessage('')
    if (!email.trim() || !password) {
      setAuthError('Enter your email and password to continue.')
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        if (data.session && data.user) {
          onAuth({ id: data.user.id, email: data.user.email })
        } else {
          setAuthMessage('Account created! Please check your email to verify, or click "Continue as Guest" to post right now.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        if (data.user && data.session) {
          onAuth({ id: data.user.id, email: data.user.email })
        } else {
          setAuthError('Could not start your session. Check your password or continue as guest.')
        }
      }
    } catch (err) {
      console.log('[v0] Email auth error:', err)
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
        setAuthError('Invalid email or password.')
      } else if (message.includes('email not confirmed')) {
        setAuthError('Please confirm your email address, or continue as guest to post now.')
      } else {
        setAuthError('Unable to authenticate. Use "Continue as Guest" for instant testing.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim() || !description.trim() || !user) return
    setIsLoading(true)
    try {
      const author = user.email ? user.email.split('@')[0] : 'Anonymous'
      const catClass = category.toLowerCase() === 'marketing' ? 'marketing' : category.toLowerCase() === 'development' ? 'development' : 'marketing'

      // Split multiline description into paragraphs
      const paragraphs = description
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)

      await onSubmit({
        id: `local-${Date.now()}`,
        user: author,
        initials: (author.charAt(0) || '👨🏻‍💼').toUpperCase(),
        time: 'just now',
        category: category || 'Other',
        categoryClass: catClass,
        title: title.trim(),
        paragraphs: paragraphs.length > 0 ? paragraphs : [description.trim()],
        frequency: frequency.trim(),
        timeWasted: timeWasted.trim(),
        currentSolution: currentSolution.trim(),
        impact: impact.trim(),
        impactDetail: impactDetail.trim() || undefined,
        lookingFor: lookingFor,
        comments: 0,
        people: 1,
        accent: 'avatar-blue',
        userId: user.id,
        commentsList: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="post-modal" role="dialog" aria-modal="true" aria-label="Share a problem">
        <button className="modal-close" onClick={onClose} aria-label="Close" type="button"><X /></button>
        {!user ? (
          <>
            <div className="modal-kicker">Be an early user on ProblemHub</div>
            <h2>Share a problem</h2>
            <p className="modal-subtitle">Tell the community what you&apos;re stuck on. Your post will appear in the feed below.</p>
            <div className="modal-auth">
              <button type="button" className={authMode === 'signup' ? 'selected' : ''} onClick={() => switchAuthMode('signup')}>Sign up</button>
              <button type="button" className={authMode === 'email' ? 'selected' : ''} onClick={() => switchAuthMode('email')}>Sign in</button>
            </div>
            {authMode === 'signup' && (
              <button className="modal-google" onClick={handleGoogleSignUp} disabled={isLoading} type="button">
                <b>G</b> Continue with Google
              </button>
            )}
            <button type="button" className="modal-email" onClick={() => switchAuthMode('email')}>
              <MessageCircle /> Continue with Email
            </button>
            <div className="email-fields">
              <input type="email" placeholder="Email address" aria-label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
              <input type="password" placeholder="Password" aria-label="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="email-continue" onClick={handleEmailAuth} disabled={isLoading}>
                {authMode === 'signup' ? 'Create account with email' : 'Sign in with email'}
              </button>
            </div>
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            {authMessage && <p className="auth-message" role="status">{authMessage}</p>}

            <button type="button" className="modal-guest" onClick={handleGuestAuth}>
              <Zap style={{ width: 16, height: 16 }} /> Continue as Guest (Instant Post)
            </button>

            <p className="auth-required">Sign in or click Continue as Guest to post your problem immediately.</p>
          </>
        ) : (
          <form onSubmit={submit} className="post-form">
            <h3 className="form-heading">Share a Problem</h3>
            
            <label>
              Title
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. How do I track which marketing campaigns actually generate revenue?"
              />
            </label>

            <label>
              Description
              <textarea
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Describe your pain point, manual effort, or why current solutions fall short..."
              />
            </label>

            <div className="form-grid-2">
              <label>
                Category
                <input
                  list="category-suggestions"
                  required
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Select or enter category..."
                />
                <datalist id="category-suggestions">
                  <option value="Marketing" />
                  <option value="Development" />
                  <option value="Operations" />
                  <option value="Finance" />
                  <option value="Design" />
                  <option value="Sales" />
                  <option value="AI & Machine Learning" />
                  <option value="Product Management" />
                  <option value="Customer Support" />
                  <option value="DevOps & Cloud" />
                  <option value="Other" />
                </datalist>
              </label>

              <label>
                Frequency
                <input
                  required
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                  placeholder="e.g. Weekly, Daily, Monthly"
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label>
                Time wasted
                <input
                  required
                  value={timeWasted}
                  onChange={(event) => setTimeWasted(event.target.value)}
                  placeholder="e.g. 4–5 hours"
                />
              </label>

              <label>
                Current solution
                <input
                  required
                  value={currentSolution}
                  onChange={(event) => setCurrentSolution(event.target.value)}
                  placeholder="e.g. Excel + manual exports"
                />
              </label>
            </div>

            <div className="form-grid-2">
              <label>
                Impact
                <input
                  required
                  value={impact}
                  onChange={(event) => setImpact(event.target.value)}
                  placeholder="e.g. High, Critical, Medium"
                />
              </label>

              <label>
                Impact detail (optional)
                <input
                  value={impactDetail}
                  onChange={(event) => setImpactDetail(event.target.value)}
                  placeholder="e.g. (time + accuracy)"
                />
              </label>
            </div>

            <div className="looking-tag-group">
              <span>Looking for:</span>
              <div className="looking-tag-row">
                {availableLookingTags.map((tag) => {
                  const isSelected = lookingFor.includes(tag)
                  return (
                    <button
                      type="button"
                      key={tag}
                      className={`tag-toggle-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleLookingTag(tag)}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <button className="submit-problem" type="submit" disabled={isLoading}>
              {isLoading ? 'Posting...' : 'Share Problem'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

function AddProductModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (msg: string) => void
}) {
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    const cleanWebsite = website.trim()
    const cleanEmail = email.trim()

    if (!cleanWebsite || !cleanEmail) {
      setErrorMsg('Please enter both website and email.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('problemhub_product_requests').insert({
        website: cleanWebsite,
        email: cleanEmail,
        status: 'pending',
      })
      if (error) {
        console.warn('Supabase product request notice:', error)
      }
    } catch (err) {
      console.warn('Product request submission error:', err)
    } finally {
      setIsLoading(false)
      setSubmitted(true)
      onSuccess('Product submission received! You will be notified soon on email.')
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="post-modal product-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add Product"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <X />
        </button>

        {submitted ? (
          <div className="product-modal-success">
            <div className="product-success-icon-wrap">
              <Check style={{ width: 28, height: 28 }} />
            </div>
            <h2>Submission Received!</h2>
            <p className="product-success-highlight">
              You will be notified soon on email.
            </p>
            <p className="product-success-sub">
              We have received your product submission for listing and review. Our team will verify your details and follow up at <strong>{email}</strong>.
            </p>
            <div className="submitted-summary-card">
              <div className="summary-line">
                <span className="summary-label">Website:</span>
                <span className="summary-val">{website}</span>
              </div>
              <div className="summary-line">
                <span className="summary-label">Email:</span>
                <span className="summary-val">{email}</span>
              </div>
            </div>
            <button
              type="button"
              className="product-modal-done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="modal-kicker">Showcase & Sponsor</div>
            <h2>Add Your Product</h2>
            <p className="modal-subtitle">
              Reach thousands of active professionals and builders solving real problems. Submit your product details below to get listed.
            </p>

            <form onSubmit={handleSubmit} className="post-form product-submit-form">
              {errorMsg && <div className="auth-error">{errorMsg}</div>}

              <label>
                Website
                <div className="modal-input-wrap">
                  <Globe className="modal-field-icon" />
                  <input
                    type="url"
                    required
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourproduct.com"
                    autoFocus
                  />
                </div>
              </label>

              <label>
                Email
                <div className="modal-input-wrap">
                  <Mail className="modal-field-icon" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@yourcompany.com"
                  />
                </div>
              </label>

              <button className="submit-problem" type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Product'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<'Latest' | 'Top' | 'Posts' | 'Saved'>('Latest')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const [posted, setPosted] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productList, setProductList] = useState<SponsoredProduct[]>([])
  const [displayedProducts, setDisplayedProducts] = useState<SponsoredProduct[]>([])
  const [swappingSlot, setSwappingSlot] = useState<number | null>(null)
  const displayedProductsRef = useRef(displayedProducts)
  displayedProductsRef.current = displayedProducts

  // 3-second random change: keeps up to 5 boxes, rotates extra products in randomly if more than 5
  useEffect(() => {
    if (productList.length <= 5) return

    const timer = setInterval(() => {
      const current = displayedProductsRef.current
      if (current.length === 0) return
      const displayedNames = new Set(current.map((p) => p.name))
      const unusedPool = productList.filter((p) => !displayedNames.has(p.name))

      if (unusedPool.length === 0) return

      const randomProduct = unusedPool[Math.floor(Math.random() * unusedPool.length)]
      const targetSlot = Math.floor(Math.random() * Math.min(5, current.length))

      setSwappingSlot(targetSlot)
      setTimeout(() => setSwappingSlot(null), 550)

      setDisplayedProducts((prev) => {
        const next = [...prev]
        next[targetSlot] = randomProduct
        return next
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [productList])

  const [showPostModal, setShowPostModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null)

  // Dynamically derive categories from live problems in the community
  const categoriesList = useMemo(() => {
    const set = new Set<string>()
    problems.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim())
      }
    })
    return ['All', ...Array.from(set)]
  }, [problems])

  // Smart header on scroll-up
  const [showHeader, setShowHeader] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const feedEl = document.querySelector('.feed') as HTMLElement | null

    const handleScroll = () => {
      const currentScrollY = feedEl && feedEl.scrollTop > 0 ? feedEl.scrollTop : window.scrollY
      const prevScrollY = lastScrollY.current

      if (currentScrollY <= 30) {
        setShowHeader(true)
        setIsScrolled(false)
        lastScrollY.current = currentScrollY
        return
      }

      setIsScrolled(true)

      const delta = currentScrollY - prevScrollY
      if (Math.abs(delta) < 6) return

      if (delta > 0) {
        // User scrolling DOWN -> hide header for comfortable reading
        setShowHeader(false)
      } else {
        // User scrolling UP -> reveal search bar, tabs, and Add Post button
        setShowHeader(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    if (feedEl) feedEl.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (feedEl) feedEl.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const loadDataRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const { data: userData } = await supabase.auth.getUser()
        const currentUser = userData?.user ? { id: userData.user.id, email: userData.user.email } : null
        if (currentUser) {
          setUser(currentUser)
        }

        // 1. Fetch Dynamic Sponsored Products
        try {
          const { data: prodData, error: prodErr } = await supabase
            .from('problemhub_products')
            .select('*')
            .order('created_at', { ascending: false })

          if (!prodErr && prodData && prodData.length > 0) {
            const mappedProds: SponsoredProduct[] = prodData.map((p: any) => ({
              name: p.name,
              description: p.description,
              className: p.class_name || 'product-blue',
              mark: p.mark || (p.name ? p.name.charAt(0).toUpperCase() : '★'),
              url: p.url || '#',
            }))
            setProductList(mappedProds)
            setDisplayedProducts(mappedProds.slice(0, 5))
          }
        } catch (e) {
          console.warn('Products fetch error:', e)
        }

        // 2. Fetch User Saved Posts (if logged in)
        const savedSet = new Set<string>()
        if (currentUser?.id) {
          try {
            const { data: savedData } = await supabase
              .from('problemhub_saved')
              .select('problem_id')
              .eq('user_id', currentUser.id)
            if (savedData) {
              savedData.forEach((s: any) => savedSet.add(s.problem_id))
            }
          } catch {}
        }

        // 3. Fetch Comments & Replies
        const commentsByProblem: Record<string, CommentItem[]> = {}
        try {
          const { data: commentsData } = await supabase
            .from('problemhub_comments')
            .select('*')
            .order('created_at', { ascending: true })

          if (commentsData && commentsData.length > 0) {
            const rawParents: Record<string, any[]> = {}
            const rawReplies: Record<string, any[]> = {}

            for (const item of commentsData) {
              if (!item.parent_id) {
                if (!rawParents[item.problem_id]) rawParents[item.problem_id] = []
                rawParents[item.problem_id].push(item)
              } else {
                if (!rawReplies[item.parent_id]) rawReplies[item.parent_id] = []
                rawReplies[item.parent_id].push(item)
              }
            }

            for (const probId of Object.keys(rawParents)) {
              commentsByProblem[probId] = rawParents[probId].map((parent: any) => ({
                id: parent.id,
                userId: parent.user_id,
                user: parent.author_name,
                initials: parent.author_initials || (parent.author_name[0] || 'U').toUpperCase(),
                accent: parent.author_accent || 'avatar-blue',
                text: parent.text,
                time: formatRelativeTime(parent.created_at),
                likes: parent.likes_count || 0,
                liked: false,
                isOp: parent.is_op,
                parentId: null,
                replies: (rawReplies[parent.id] || []).map((rep: any) => ({
                  id: rep.id,
                  userId: rep.user_id,
                  user: rep.author_name,
                  initials: rep.author_initials || (rep.author_name[0] || 'U').toUpperCase(),
                  accent: rep.author_accent || 'avatar-green',
                  text: rep.text,
                  time: formatRelativeTime(rep.created_at),
                  likes: rep.likes_count || 0,
                  liked: false,
                  isOp: rep.is_op,
                  parentId: parent.id,
                })),
              }))
            }
          }
        } catch (e) {
          console.warn('Comments fetch error:', e)
        }

        // 4. Fetch User Reactions (Problem & Solution votes)
        const voterId = currentUser?.id || getClientVoterId()
        const localReactions = getLocalReactions()
        const userReactionsSet = new Set<string>()

        try {
          const { data: rxData, error: rxErr } = await supabase
            .from('problemhub_reactions')
            .select('problem_id, reaction_type')
            .eq('user_id', voterId)
          if (!rxErr && rxData) {
            rxData.forEach((r: any) => userReactionsSet.add(`${r.problem_id}:${r.reaction_type}`))
          }
        } catch (e) {
          console.warn('Reactions fetch note (dynamic mode):', e)
        }

        // 5. Fetch Dynamic Posts
        const { data: postsData, error: postsErr } = await supabase
          .from('problemhub_posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (!postsErr && postsData && postsData.length > 0) {
          const mappedPosts: Problem[] = postsData.map((post: any) => {
            const postComments = commentsByProblem[post.id] || []
            const totalCount = postComments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0) || post.comments_count || 0
            const hasProblemVote = userReactionsSet.has(`${post.id}:problem`) || Boolean(localReactions[`${post.id}:problem`])
            let hasSolutionVote = userReactionsSet.has(`${post.id}:solution`) || Boolean(localReactions[`${post.id}:solution`])
            if (hasProblemVote && hasSolutionVote) {
              hasSolutionVote = false
            }

            return {
              id: post.id,
              userId: post.user_id,
              user: post.author_name || 'Community Member',
              initials: post.author_initials || (post.author_name ? post.author_name.charAt(0) : 'U').toUpperCase(),
              time: formatRelativeTime(post.created_at),
              category: post.category || 'General',
              categoryClass: (post.category || 'general').toLowerCase().replace(/[^a-z0-9]/g, '-'),
              title: post.title,
              paragraphs: post.description ? post.description.split('\n\n') : [''],
              frequency: post.frequency || '',
              timeWasted: post.time_wasted || '',
              currentSolution: post.current_solution || '',
              impact: post.impact || '',
              impactDetail: post.impact_detail || '',
              lookingFor: post.looking_for || [],
              comments: totalCount,
              people: post.people_count || 1,
              problemVotes: post.problem_votes ?? 0,
              solutionVotes: post.solution_votes ?? 0,
              userVotedProblem: hasProblemVote,
              userVotedSolution: hasSolutionVote,
              accent: post.author_accent || 'avatar-blue',
              saved: savedSet.has(post.id),
              commentsList: postComments,
            }
          })
          setProblems(mappedPosts)
        } else if (!postsErr && postsData && postsData.length === 0) {
          setProblems([])
        }
      } catch (err) {
        console.warn('Supabase initialization handled in dynamic mode:', err)
      }
    }

    loadDataRef.current = loadData
    loadData().then(() => {
      // Small delay to let React render, then fade in
      requestAnimationFrame(() => setPageReady(true))
    })

    let listener: { subscription?: { unsubscribe: () => void } } | null = null
    try {
      const supabase = createClient()
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        setUser(session?.user ? { id: session.user.id, email: session.user.email } : null)
      )
      listener = data
    } catch {}

    return () => {
      listener?.subscription?.unsubscribe()
    }
  }, [])


  const filteredProblems = useMemo(() => {
    let list = problems.filter((problem) => {
      const textMatch = `${problem.title} ${problem.category} ${problem.user} ${problem.paragraphs.join(' ')}`.toLowerCase().includes(query.toLowerCase())
      const categoryMatch = selectedCategory === 'All' || problem.category.toLowerCase() === selectedCategory.toLowerCase()
      return textMatch && categoryMatch
    })

    if (activeTab === 'Top') {
      list = [...list].sort((a, b) => {
        const scoreB = ((b.problemVotes || 0) + (b.solutionVotes || 0)) * 3 + (b.comments || 0) * 2 + (b.people || 0)
        const scoreA = ((a.problemVotes || 0) + (a.solutionVotes || 0)) * 3 + (a.comments || 0) * 2 + (a.people || 0)
        return scoreB - scoreA
      })
    } else if (activeTab === 'Posts') {
      if (!user) return []
      const userHandle = (user.email?.split('@')[0] || '').toLowerCase()
      const userId = user.id

      list = list.filter((problem) => {
        const isAuthor = problem.userId === userId || problem.user.toLowerCase() === userHandle
        const hasReplied = problem.commentsList?.some(
          (c) =>
            c.userId === userId ||
            c.user.toLowerCase() === userHandle ||
            c.replies?.some((r) => r.userId === userId || r.user.toLowerCase() === userHandle)
        )
        return isAuthor || hasReplied
      })
    } else if (activeTab === 'Saved') {
      list = list.filter((problem) => Boolean(problem.saved))
    }
    return list
  }, [problems, query, selectedCategory, activeTab, user])

  async function handleSignOut() {
    try {
      await createClient().auth.signOut()
    } catch {}
    setUser(null)
    setShowPostModal(false)
  }

  async function handleToggleReaction(problemId: string, type: 'problem' | 'solution') {
    const voterId = user?.id || getClientVoterId()
    let nextVotedProblem = false
    let nextVotedSolution = false
    let nextProblemCount = 0
    let nextSolutionCount = 0

    // 1. Instant optimistic UI update (0ms latency, strictly one at a time)
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id !== problemId) return p

        const currentProblemVoted = Boolean(p.userVotedProblem)
        const currentSolutionVoted = Boolean(p.userVotedSolution)
        let pVotes = p.problemVotes || 0
        let sVotes = p.solutionVotes || 0

        if (type === 'problem') {
          if (currentProblemVoted) {
            // Already voted problem -> toggle off (unvote)
            nextVotedProblem = false
            nextVotedSolution = false
            pVotes = Math.max(0, pVotes - 1)
          } else {
            // Activate Problem vote
            nextVotedProblem = true
            pVotes = pVotes + 1
            // If Solution was active, switch from Solution to Problem
            if (currentSolutionVoted) {
              nextVotedSolution = false
              sVotes = Math.max(0, sVotes - 1)
            } else {
              nextVotedSolution = false
            }
          }
        } else {
          // type === 'solution'
          if (currentSolutionVoted) {
            // Already voted solution -> toggle off (unvote)
            nextVotedSolution = false
            nextVotedProblem = false
            sVotes = Math.max(0, sVotes - 1)
          } else {
            // Activate Solution vote
            nextVotedSolution = true
            sVotes = sVotes + 1
            // If Problem was active, switch from Problem to Solution
            if (currentProblemVoted) {
              nextVotedProblem = false
              pVotes = Math.max(0, pVotes - 1)
            } else {
              nextVotedProblem = false
            }
          }
        }

        nextProblemCount = pVotes
        nextSolutionCount = sVotes

        return {
          ...p,
          userVotedProblem: nextVotedProblem,
          userVotedSolution: nextVotedSolution,
          problemVotes: nextProblemCount,
          solutionVotes: nextSolutionCount,
        }
      })
    )

    // 2. Cache in localStorage (mutually exclusive)
    const activeType = nextVotedProblem ? 'problem' : nextVotedSolution ? 'solution' : null
    if (activeType) {
      setLocalReaction(problemId, activeType, true)
    } else {
      setLocalReaction(problemId, type, false)
    }

    // 3. Persist reaction to Supabase asynchronously
    try {
      const supabase = createClient()

      // Remove any prior reaction for this user on this post
      await supabase
        .from('problemhub_reactions')
        .delete()
        .match({
          problem_id: problemId,
          user_id: voterId,
        })

      // If user selected a reaction, insert the new one
      if (activeType) {
        await supabase.from('problemhub_reactions').insert({
          problem_id: problemId,
          user_id: voterId,
          reaction_type: activeType,
        })
      }

      // Synchronize counters on problemhub_posts
      await supabase
        .from('problemhub_posts')
        .update({
          problem_votes: nextProblemCount,
          solution_votes: nextSolutionCount,
        })
        .eq('id', problemId)
    } catch (err) {
      console.warn('Supabase reaction sync error (handled dynamically):', err)
    }
  }

  async function handleSubmit(problem: Problem) {
    if (!user) return
    let createdId = problem.id

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('problemhub_posts')
        .insert({
          user_id: user.id,
          author_name: problem.user,
          author_initials: problem.initials,
          author_accent: problem.accent,
          title: problem.title,
          category: problem.category,
          description: problem.paragraphs.join('\n\n'),
          frequency: problem.frequency,
          time_wasted: problem.timeWasted,
          current_solution: problem.currentSolution,
          impact: problem.impact,
          impact_detail: problem.impactDetail,
          looking_for: problem.lookingFor,
          comments_count: 0,
          people_count: 1,
          problem_votes: 0,
          solution_votes: 0,
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        createdId = data.id
      } else {
        console.warn('Supabase post stored in local session:', error)
      }
    } catch (err) {
      console.warn('Supabase insert note, storing in local feed:', err)
    }

    setProblems((current) => [
      {
        ...problem,
        id: createdId,
        userId: user.id,
        problemVotes: 0,
        solutionVotes: 0,
        userVotedProblem: false,
        userVotedSolution: false,
      },
      ...current,
    ])
    setPosted(true)
    setShowPostModal(false)
  }

  async function handleToggleSave(id: string) {
    let willSave = false
    setProblems((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          willSave = !p.saved
          return { ...p, saved: willSave }
        }
        return p
      })
    )

    if (user?.id) {
      try {
        const supabase = createClient()
        if (willSave) {
          await supabase.from('problemhub_saved').insert({
            user_id: user.id,
            problem_id: id,
          })
        } else {
          await supabase
            .from('problemhub_saved')
            .delete()
            .match({ user_id: user.id, problem_id: id })
        }
      } catch (err) {
        console.warn('Saved sync error:', err)
      }
    }
  }

  async function handleAddComment(problemId: string, text: string, parentId?: string | null) {
    const author = user?.email ? user.email.split('@')[0] : 'Community Member'
    const newCommentId = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newComment: CommentItem = {
      id: newCommentId,
      userId: user?.id || 'guest',
      user: author,
      initials: (author[0] || 'U').toUpperCase(),
      accent: 'avatar-emerald',
      text,
      time: 'just now',
      likes: 0,
      liked: false,
      parentId: parentId || null,
      replies: [],
    }

    // Persist to Supabase
    try {
      const supabase = createClient()
      await supabase.from('problemhub_comments').insert({
        id: newCommentId,
        problem_id: problemId,
        parent_id: parentId || null,
        user_id: user?.id || 'guest',
        author_name: author,
        author_initials: (author[0] || 'U').toUpperCase(),
        author_accent: 'avatar-emerald',
        text,
        likes_count: 0,
        is_op: false,
      })
    } catch (err) {
      console.warn('Comment saved locally:', err)
    }

    const updater = (prevProblems: Problem[]) =>
      prevProblems.map((p) => {
        if (p.id !== problemId) return p
        const list = p.commentsList || []
        let updatedList: CommentItem[]

        if (parentId) {
          updatedList = list.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              }
            }
            return c
          })
        } else {
          updatedList = [...list, newComment]
        }

        const totalCount = updatedList.reduce(
          (acc, cur) => acc + 1 + (cur.replies ? cur.replies.length : 0),
          0
        )

        return {
          ...p,
          comments: totalCount,
          commentsList: updatedList,
        }
      })

    setProblems(updater)
  }

  async function handleToggleLikeComment(problemId: string, commentId: string) {
    let nextLikes = 0
    let isLikedNow = false

    const updater = (prevProblems: Problem[]) =>
      prevProblems.map((p) => {
        if (p.id !== problemId) return p
        const list = p.commentsList || []

        const updateItem = (item: CommentItem): CommentItem => {
          if (item.id === commentId) {
            isLikedNow = !item.liked
            nextLikes = isLikedNow ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1)
            return {
              ...item,
              liked: isLikedNow,
              likes: nextLikes,
            }
          }
          if (item.replies && item.replies.length > 0) {
            return {
              ...item,
              replies: item.replies.map(updateItem),
            }
          }
          return item
        }

        return {
          ...p,
          commentsList: list.map(updateItem),
        }
      })

    setProblems(updater)

    try {
      const supabase = createClient()
      await supabase
        .from('problemhub_comments')
        .update({ likes_count: nextLikes })
        .eq('id', commentId)
    } catch {}
  }

  function handleShare(problem: Problem) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin}/#problem-${problem.id}`)
      setToastMessage(`Copied link to "${problem.title.slice(0, 32)}..."`)
      setTimeout(() => setToastMessage(null), 3000)
    }
  }


  // Smooth refresh: fade out, re-fetch data, scroll to top, reset state, fade in
  async function refreshApp() {
    setIsRefreshing(true)
    // Wait for the fade-out transition
    await new Promise((r) => setTimeout(r, 250))
    // Reset UI state
    setActiveTab('Latest')
    setSelectedCategory('All')
    setShowFilters(false)
    setQuery('')
    setPosted(false)
    setShowPostModal(false)
    setShowAddProductModal(false)
    setToastMessage(null)
    // Scroll to top instantly
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Re-fetch all data
    if (loadDataRef.current) {
      await loadDataRef.current()
    }
    // Small pause then fade back in
    await new Promise((r) => setTimeout(r, 80))
    setIsRefreshing(false)
  }

  return (
    <>
      {/* Loading Splash — shows ProblemHub logo while data loads */}
      <div className={`splash-screen ${pageReady && !isRefreshing ? 'splash-hidden' : ''}`}>
        <div className="splash-content">
          <img
            src="/Problemhub logo.png"
            alt="ProblemHub"
            className="splash-logo"
            width={80}
            height={80}
          />
          <span className="splash-brand">Problem<strong>Hub</strong></span>
        </div>
      </div>

      <main className={`app-shell ${pageReady ? 'app-ready' : 'app-loading'} ${isRefreshing ? 'app-refreshing' : ''}`}>
      {toastMessage && (
        <div className="share-toast" role="status">
          <Check style={{ width: 18, height: 18 }} /> {toastMessage}
        </div>
      )}

      <aside className="left-rail">
        <div className="left-rail-brand-row">
          <Logo onRefresh={refreshApp} />
          <div className="mobile-header-actions">
            <button
              type="button"
              className="mobile-share-btn"
              onClick={() => setShowPostModal(true)}
              title="Share a Problem"
              aria-label="Share a Problem"
            >
              <Pencil style={{ width: 14, height: 14 }} />
              <span>Share</span>
            </button>
            {user ? (
              <div className="mobile-user-wrap">
                <div className="account-circle-avatar mobile-avatar" title={user.email || 'User'}>
                  {(user.email?.[0] || 'U').toUpperCase()}
                </div>
                <button
                  type="button"
                  className="mobile-logout-btn"
                  onClick={handleSignOut}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mobile-signin-btn"
                onClick={() => setShowPostModal(true)}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
        {user ? (
          <div className="signed-in-rail">
            <div className="signed-in-intro slogan-text">
              Share Problems.<br />Discover Opportunities.<br /><span>Build a Better Tomorrow.</span>
            </div>
            <div className="prompt-list">
              {reflectionPrompts.map((prompt) => (
                <p key={prompt}>{prompt}</p>
              ))}
            </div>
            <p className="notice-share">Notice it. Describe it. Share it.</p>
            <button type="button" className="share-problem-button" onClick={() => setShowPostModal(true)}>
              <Pencil /> Share a Problem
            </button>

            <div className="left-rail-account">
              <div className="account-circle-avatar" title={user.email || 'User'}>
                {(user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="account-info">
                <span className="account-name">{user.email?.split('@')[0] || 'ProblemHub User'}</span>
                <span className="account-email">{user.email || ''}</span>
              </div>
              <button
                type="button"
                className="account-logout-btn"
                onClick={handleSignOut}
                aria-label="Log out"
                title="Log out"
              >
                <LogOut style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="intro">
              <h1 className="slogan-text">
                Share Problems.<br />Discover Opportunities.<br /><span>Build a Better Tomorrow.</span>
              </h1>
            </div>
            <div className="signup-stack">
              <button type="button" className="google-button" onClick={() => setShowPostModal(true)}>
                <b>G</b>Sign up with Google
              </button>
              <button type="button" className="email-button" onClick={() => setShowPostModal(true)}>
                <MessageCircle /> Sign up with Email
              </button>
            </div>
            <p className="legal">
              By continuing, you agree to our <a href="#terms">User Agreement</a> and acknowledge that you understand the <a href="#privacy">Privacy Policy.</a>
            </p>
            <div className="rail-caption">
              <i />
              <p>Real problems.<br />Real people.<br />Better solutions.</p>
            </div>
          </>
        )}
      </aside>

      <section className="feed">
        <div className={`feed-sticky-header ${isScrolled ? 'is-scrolled' : ''} ${showHeader ? 'show' : 'hide'}`}>
          <div className="search-row">
            <label className="search-box">
              <Search />
              <input
                aria-label="Search problems"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search problems, categories, or keywords..."
              />
            </label>
            <button
              type="button"
              className="filter-button"
              aria-label="Toggle category filter bar"
              title="Filter by category"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal style={{ color: showFilters || selectedCategory !== 'All' ? '#087cff' : '#c4d0dd' }} />
            </button>
          </div>

          {showFilters && (
            <div className="category-filter-bar" role="toolbar" aria-label="Filter by category">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <nav className="tabs" aria-label="Problem sorting tabs">
            <div className="tabs-list">
              {(['Latest', 'Top', 'Posts', 'Saved'] as const).map((tab) => (
                <button
                  type="button"
                  className={activeTab === tab ? 'active' : ''}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="tab-add-post-btn"
              onClick={() => setShowPostModal(true)}
              aria-label="Add a new post"
            >
              <Plus />
              <span>Add Post</span>
            </button>
          </nav>
        </div>

        {posted && (
          <div className="posted-note">
            <Check /> Your problem was added to the community feed.
          </div>
        )}

        {filteredProblems.length ? (
          filteredProblems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              onToggleSave={handleToggleSave}
              onShare={handleShare}
              onAddComment={handleAddComment}
              onToggleLikeComment={handleToggleLikeComment}
              onToggleReaction={handleToggleReaction}
              user={user}
            />
          ))
        ) : (
          <div className="empty-state">
            {problems.length === 0 ? (
              <div className="empty-feed-card">
                <div className="empty-feed-icon">💡</div>
                <h3>No problems shared yet</h3>
                <p>
                  Be the first to share a frustration, inefficiency, or pain point you face in your daily work. Discover opportunities and build solutions together.
                </p>
                <button
                  type="button"
                  className="empty-feed-btn"
                  onClick={() => setShowPostModal(true)}
                >
                  <Plus style={{ width: 16, height: 16 }} /> Share a Problem
                </button>
              </div>
            ) : activeTab === 'Saved' ? (
              'You have no saved problems yet. Click "Save" on any problem to bookmark it here.'
            ) : activeTab === 'Posts' ? (
              user ? (
                'You haven\'t posted any problems or replies yet. Share a problem or comment on discussions to see them here.'
              ) : (
                <div className="tab-signin-prompt">
                  <p>Sign in to view your posts and replies.</p>
                  <button type="button" className="tab-signin-btn" onClick={() => setShowPostModal(true)}>
                    Sign In to View Posts
                  </button>
                </div>
              )
            ) : (
              <div className="empty-search-state">
                <p>No problems match “{query || selectedCategory}”.</p>
                {(query || selectedCategory !== 'All') && (
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={() => {
                      setQuery('')
                      setSelectedCategory('All')
                    }}
                  >
                    Clear search & filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="right-rail">
        {!user && (
          <section className="ask-card">
            <h2>Have a problem?</h2>
            <p>
              Share a real problem you face in your work or professional life. The community can discuss it, and maybe someone will build a solution.
            </p>
            <button type="button" className="post-button" onClick={() => setShowPostModal(true)}>
              <Pencil /> Post a Problem
            </button>
          </section>
        )}

        <section className="sponsored-card">
          <div className="sponsored-head">
            <h3>Sponsored <span>ⓘ</span></h3>
            <button type="button" onClick={() => setShowAddProductModal(true)}>
              <Plus /> Add Product
            </button>
          </div>

          {displayedProducts.length > 0 ? (
            <div className="sponsored-boxes-list">
              {displayedProducts.slice(0, 5).map((product, idx) => (
                <div
                  className={`product ${product.className} ${swappingSlot === idx ? 'is-swapping' : ''}`}
                  key={`${product.name}-${idx}`}
                  onClick={() => {
                    if (product.url) window.open(product.url, '_blank', 'noopener,noreferrer')
                  }}
                  role="button"
                  tabIndex={0}
                  title={`Visit ${product.name}`}
                >
                  <div className={`product-mark ${product.className}`}>{product.mark}</div>
                  <div className="product-details">
                    <strong>{product.name}</strong>
                    <p>{product.description}</p>
                  </div>
                  <ExternalLink />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-sponsored-box">
              <p>No sponsored tools listed yet.</p>
              <button
                type="button"
                className="empty-sponsored-btn"
                onClick={() => setShowAddProductModal(true)}
              >
                <Plus style={{ width: 14, height: 14 }} /> Add Product
              </button>
            </div>
          )}
        </section>
      </aside>

      {showPostModal && (
        <PostProblemModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleSubmit}
          user={user}
          onAuth={setUser}
        />
      )}

      {showAddProductModal && (
        <AddProductModal
          onClose={() => setShowAddProductModal(false)}
          onSuccess={(msg) => {
            setToastMessage(msg)
            setTimeout(() => setToastMessage(null), 5000)
          }}
        />
      )}
    </main>
    </>
  )
}

var CSS = `
#ui{--ink:#e8ebe6;--dim:rgba(232,235,230,.62);--faint:rgba(232,235,230,.34);--line:rgba(232,235,230,.18);--amber:#f2a31b;--red:#ff4b38;--green:#55d48a;--blue:#7fc4ff;--glass:rgba(7,11,14,.72);--cross:#eef2f4;--s:1;
 font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:calc(clamp(10px,.62vw + .42vh,19px)*var(--s));color:var(--ink);user-select:none;-webkit-user-select:none;font-variant-numeric:tabular-nums;line-height:1.2}
#ui *{box-sizing:border-box}
#ui svg.gt{display:inline-block;vertical-align:top;overflow:visible}#ui svg.ic{width:1.25em;height:1.25em;display:inline-block;vertical-align:-.25em;flex:none}#ui svg.gun{height:2.7em;display:block}
#ui .lab{font-size:.68em;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);font-weight:600}
#ui .hud{position:absolute;inset:0;opacity:0;transition:opacity .3s;pointer-events:none}#ui.play .hud{opacity:1}
#ui .hud>div{position:absolute;text-shadow:0 1px 2px rgba(0,0,0,.85)}
#ui .hud:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 30% 34% at 0% 100%,rgba(0,0,0,.55),transparent 72%),radial-gradient(ellipse 32% 36% at 100% 100%,rgba(0,0,0,.55),transparent 72%),radial-gradient(ellipse 26% 30% at 100% 0%,rgba(0,0,0,.45),transparent 72%),radial-gradient(ellipse 24% 34% at 0% 0%,rgba(0,0,0,.4),transparent 72%),radial-gradient(ellipse 26% 16% at 50% 0%,rgba(0,0,0,.4),transparent 72%)}

/* top left: drone feed */
#ui .tl{left:1.8em;top:1.6em}#ui .mm{position:relative;width:13.4em;height:13.4em}#ui .mm canvas{width:100%;height:100%;display:block}#ui .mm.off{display:none}
#ui .uav{margin-top:.55em;display:flex;align-items:center;gap:.5em;font-size:.72em;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);font-weight:600;min-width:18.6em;white-space:nowrap}#ui .uav span{color:var(--dim);font-weight:500;margin-left:auto;padding-left:1em}#ui .uav i{width:.5em;height:.5em;border-radius:50%;background:var(--blue);animation:cxpulse 1.6s infinite}
#ui .uav.hot{color:var(--amber)}#ui .uav.hot i{background:var(--amber)}#ui .uav.off{color:var(--dim)}#ui .uav.off i{background:var(--faint);animation:none}#ui .uav kbd{display:none;font:inherit;font-size:.92em;letter-spacing:0;color:#0a0e11;background:var(--blue);border-radius:.2em;padding:.05em .45em;font-weight:700}#ui .uav.rdy kbd{display:inline-block}
#ui .uavb{margin-top:.38em;width:13.4em;height:.2em;background:var(--line);overflow:hidden}#ui .uavb u{display:block;height:100%;background:var(--dim);transform-origin:0 50%;transform:scaleX(0)}#ui .uavb.scan u{background:var(--blue)}
@keyframes cxpulse{0%,100%{opacity:1}50%{opacity:.25}}
/* top centre: heading tape and wave */
#ui .tc{left:50%;top:1.3em;transform:translateX(-50%);width:28em;text-align:center}#ui .cmp{width:100%;height:1.95em;display:block}
#ui .wv{margin-top:.7em;display:flex;align-items:center;gap:.7em;justify-content:center}#ui .wv-n{font-size:1.35em;color:var(--ink);line-height:1}#ui .wv-bar{flex:1;max-width:11em;height:.28em;background:rgba(232,235,230,.14);position:relative;overflow:hidden}#ui .wv-bar i{position:absolute;inset:0;background:var(--amber);transform-origin:0 50%;transform:scaleX(0);transition:transform .25s}
#ui .wv-r{font-size:.74em;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);min-width:8.5em;text-align:left;font-weight:600}#ui .wv.inter .wv-r{color:var(--amber)}
/* top right: score, chain, log */
#ui .tr{right:1.8em;top:1.5em;text-align:right;width:17em}#ui .sc{font-size:2.5em;line-height:1;margin-top:.14em}
#ui .ch{margin-top:.6em;opacity:0;transition:opacity .2s;color:var(--amber)}#ui .ch.on{opacity:1}#ui .ch span{font-size:.82em;letter-spacing:.18em;font-weight:700;text-transform:uppercase}#ui .ch-bar{height:.2em;margin:.3em 0 0 auto;width:9em;background:rgba(242,163,27,.2)}#ui .ch-bar i{display:block;height:100%;background:var(--amber);transform-origin:100% 50%}
#ui .log{margin-top:.8em;font-size:.76em;line-height:1.55;letter-spacing:.04em}#ui .log div{animation:cxlog 4.2s forwards;white-space:nowrap;color:var(--dim)}#ui .log .h{color:var(--red)}#ui .log .c{color:var(--amber)}#ui .log .u{color:var(--blue)}
@keyframes cxlog{0%{opacity:0;transform:translateX(.6em)}5%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
/* bottom left: vitals */
#ui .bl{left:1.8em;bottom:1.6em;width:19em}#ui .stn{display:inline-flex;align-items:center;gap:.4em;font-size:.72em;letter-spacing:.18em;font-weight:700;text-transform:uppercase;color:var(--dim);margin-bottom:.6em;padding:.28em .6em .28em .4em;border-left:.16em solid var(--faint);background:linear-gradient(90deg,rgba(7,11,14,.6),transparent)}
#ui .stn.a{color:var(--amber);border-color:var(--amber)}
#ui .hp{display:flex;align-items:flex-end;gap:.6em}#ui .hp-n{font-size:2.5em;line-height:1;min-width:2.3em}#ui .hp svg.ic{width:1.3em;height:1.3em;margin-bottom:.35em;color:var(--dim)}
#ui .hp-bar{position:relative;height:.62em;margin-top:.55em;background:rgba(232,235,230,.12)}#ui .hp-bar i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:0 50%}#ui .hp-bar .gh{background:var(--red);opacity:.75}#ui .hp-bar .fl{background:var(--ink)}
#ui .hp-bar b{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(10% - .14em),rgba(5,8,10,.95) calc(10% - .14em),rgba(5,8,10,.95) 10%)}
#ui .bl.low .hp-n{color:var(--red)}#ui .bl.low .hp-bar .fl{background:var(--red)}#ui .bl.low .hp svg.ic{color:var(--red);animation:cxpulse .8s infinite}
#ui .stam{height:.16em;margin-top:.35em;background:rgba(232,235,230,.12)}#ui .stam i{display:block;height:100%;background:var(--amber);transform-origin:0 50%}
/* bottom right: weapon */
#ui .br{right:1.8em;bottom:1.6em;text-align:right;width:20em}#ui .wn{display:flex;justify-content:flex-end;align-items:center;gap:.7em}
#ui .lamp{font-size:.6em;letter-spacing:.16em;font-weight:700;padding:.2em .55em;border:1px solid var(--faint);color:var(--dim)}#ui .lamp.on{background:var(--ink);color:#0b1114;border-color:var(--ink);text-shadow:none}
#ui .gunrow{display:flex;justify-content:flex-end;margin:.45em 0 .5em;color:rgba(232,235,230,.82);filter:drop-shadow(0 1px 2px rgba(0,0,0,.8))}
#ui .pips{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.16em;margin-left:auto}#ui .pips i{width:.3em;height:.9em;background:var(--ink);transform:skewX(-12deg)}#ui .pips i.o{background:rgba(232,235,230,.16)}#ui .pips.low i:not(.o){background:var(--amber)}#ui .pips.p15{width:9.2em}#ui .pips.p30{width:9.2em}#ui .pips.p15 i{width:.42em}
#ui .am{display:flex;justify-content:flex-end;align-items:flex-end;gap:.5em;margin-top:.5em}#ui .am-n{font-size:3em;line-height:1}#ui .am-s{font-size:1.2em;color:var(--faint);padding-bottom:.1em}#ui .am-r{font-size:1.25em;line-height:1;color:var(--dim);padding-bottom:.16em}
#ui .am-n.red{color:var(--red)}#ui .am-n.amber{color:var(--amber)}#ui .am-m{font-size:.66em;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);font-weight:600;padding-bottom:.5em;margin-left:.6em}
/* centre */
#ui .cross{left:50%;top:50%;width:0;height:0;text-shadow:none}#ui .cross b{position:absolute;background:var(--cross);box-shadow:0 0 0 1px rgba(0,0,0,.55)}#ui .cross .d{width:2px;height:2px;left:-1px;top:-1px}
#ui .rl{left:50%;top:50%;width:4.4em;height:4.4em;margin:-2.2em 0 0 -2.2em;opacity:0;transition:opacity .12s}#ui .rl.on{opacity:1}#ui .rl svg{width:100%;height:100%;transform:rotate(-90deg)}#ui .rl circle{fill:none;stroke-width:2.2}#ui .rl .bg{stroke:rgba(232,235,230,.18)}#ui .rl .fg{stroke:var(--amber);stroke-linecap:butt}
#ui .rl span{position:absolute;left:0;right:0;top:108%;text-align:center;font-size:.62em;letter-spacing:.22em;color:var(--amber);font-weight:700}
#ui .hm{left:50%;top:50%;width:1.9em;height:1.9em;margin:-.95em 0 0 -.95em;opacity:0}#ui .hm:before,#ui .hm:after{content:"";position:absolute;left:calc(50% - 1px);top:0;width:2px;height:100%;background:#fff;transform:rotate(45deg);clip-path:polygon(0 0,100% 0,100% 30%,0 30%,0 70%,100% 70%,100% 100%,0 100%)}#ui .hm:after{transform:rotate(-45deg)}#ui .hm.k:before,#ui .hm.k:after{background:var(--red)}
#ui .dir{left:50%;top:50%;width:22em;height:22em;margin:-11em 0 0 -11em;opacity:0;border-radius:50%;background:conic-gradient(from -24deg,rgba(255,75,56,0) 0deg,rgba(255,75,56,.9) 24deg,rgba(255,75,56,0) 48deg,rgba(0,0,0,0) 48deg);-webkit-mask:radial-gradient(circle,transparent 62%,#000 63%,#000 70%,transparent 71%);mask:radial-gradient(circle,transparent 62%,#000 63%,#000 70%,transparent 71%)}
#ui .feed{left:50%;top:50%;margin:-.6em 0 0 4em;width:20em;font-size:.86em;line-height:1.5;font-weight:600;letter-spacing:.04em}#ui .feed div{animation:cxfeed 1.25s ease-out forwards;white-space:nowrap}#ui .feed .h{color:var(--red)}#ui .feed .c{color:var(--amber);font-size:1.1em;letter-spacing:.14em;text-transform:uppercase}
@keyframes cxfeed{0%{opacity:0;transform:translateY(.5em)}12%{opacity:1;transform:none}70%{opacity:1}100%{opacity:0;transform:translateY(-1em)}}
#ui .banner{left:0;right:0;top:21%;text-align:center;opacity:0;transition:opacity .35s}#ui .banner.on{opacity:1}#ui .banner .t{font-size:3.3em;line-height:1}#ui .banner .r{width:0;height:.18em;background:var(--amber);margin:.9em auto .7em;transition:width .7s cubic-bezier(.2,.7,.2,1)}#ui .banner.on .r{width:16em}
#ui .banner .s{font-size:.86em;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);font-weight:600}
#ui .toast{left:50%;bottom:19%;transform:translateX(-50%);opacity:0;transition:opacity .25s;font-size:.8em;letter-spacing:.14em;text-transform:uppercase;font-weight:600;padding:.5em 1em;background:var(--glass);border-left:.2em solid var(--blue);white-space:nowrap}#ui .toast.on{opacity:1}
#ui .hint{left:0;right:0;bottom:29%;text-align:center;font-size:.8em;letter-spacing:.16em;text-transform:uppercase;font-weight:700;opacity:0;color:var(--amber)}
#ui .dbg{left:50%;bottom:.5em;transform:translateX(-50%);font-size:.66em;color:var(--dim);white-space:nowrap;font-family:ui-monospace,Menlo,Consolas,monospace}

/* screens */
#ui .panel{position:absolute;inset:0;display:none;pointer-events:auto}#ui .panel.on{display:flex}
#ui .col{width:min(36em,92vw);height:100%;padding:0 0 0 5.2em;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1}
#ui .title{background:linear-gradient(90deg,rgba(3,6,8,.94) 0,rgba(3,6,8,.84) 24em,rgba(3,6,8,.25) 46em,rgba(3,6,8,0) 62em),linear-gradient(0deg,rgba(3,6,8,.7),transparent 30%)}
#ui .pausep{background:linear-gradient(90deg,rgba(3,6,8,.95) 0,rgba(3,6,8,.86) 24em,rgba(3,6,8,.55) 100%)}
#ui .kick{font-size:.68em;letter-spacing:.34em;text-transform:uppercase;color:var(--amber);font-weight:700;margin-bottom:1.6em;display:flex;align-items:center;gap:.9em}#ui .kick:before{content:"";width:2.6em;height:.14em;background:var(--amber)}
#ui .logo{font-size:4.4em;line-height:1;color:var(--ink)}#ui .logo .gt.hl{color:var(--amber);margin-left:.42em}
#ui .strap{margin-top:1.3em;font-size:.86em;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);font-weight:500}
#ui .menu{margin-top:2.6em;display:flex;flex-direction:column;gap:.5em;width:21em}
#ui button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:left}
#ui .btn{position:relative;display:flex;align-items:center;gap:.9em;padding:.82em 1.1em .82em 1.3em;font-size:.95em;letter-spacing:.22em;text-transform:uppercase;font-weight:700;color:var(--ink);background:rgba(232,235,230,.055);clip-path:polygon(0 0,calc(100% - .8em) 0,100% .8em,100% 100%,0 100%);transition:background .12s,padding .12s,color .12s}
#ui .btn:before{content:"";position:absolute;left:0;top:0;bottom:0;width:.22em;background:var(--faint);transition:background .12s,width .12s}#ui .btn kbd{margin-left:auto}
#ui .btn:hover,#ui .btn:focus-visible{background:rgba(232,235,230,.13);padding-left:1.7em;outline:none}#ui .btn:hover:before,#ui .btn:focus-visible:before{background:var(--amber);width:.36em}
#ui .btn.pri{background:var(--amber);color:#110c02}#ui .btn.pri:before{background:#110c02;opacity:.35}#ui .btn.pri:hover,#ui .btn.pri:focus-visible{background:#ffb836}#ui .btn.pri kbd{border-color:rgba(17,12,2,.45);color:#110c02}
#ui .btn.sm{font-size:.78em;padding:.7em 1em .7em 1.2em}
#ui kbd{font:inherit;font-size:.68em;letter-spacing:.08em;font-weight:700;border:1px solid var(--faint);padding:.16em .5em;color:var(--dim);border-radius:.15em;white-space:nowrap;text-transform:uppercase}
#ui .maps{margin-top:1.4em;display:flex;gap:.6em;width:26em}#ui .mapc{flex:1;padding:.8em .9em;background:rgba(232,235,230,.05);border:1px solid var(--line);font-size:.8em}#ui .mapc b{display:block;letter-spacing:.14em;text-transform:uppercase;margin-bottom:.3em}#ui .mapc span{color:var(--dim);font-size:.9em}#ui .mapc.on{border-color:var(--amber);background:rgba(242,163,27,.1)}#ui .mapc:hover{border-color:var(--ink)}
#ui .best{margin-top:1.8em;display:flex;align-items:baseline;gap:.8em}#ui .best .v{font-size:1.25em}
#ui .pitch{position:absolute;left:6.84em;bottom:3.4em;width:30em;font-size:.76em;line-height:1.6;color:var(--dim);z-index:1}#ui .pitch b{color:var(--ink);font-weight:600}
#ui .keys{position:absolute;right:2.6em;bottom:2.4em;width:25em;padding:1.1em 1.2em;background:var(--glass);border-top:.14em solid var(--amber);z-index:1}#ui .keys h3{margin:0 0 .8em;font-size:.68em;letter-spacing:.24em;text-transform:uppercase;color:var(--dim);font-weight:700}
#ui .keys ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:.42em 1.2em;font-size:.76em}#ui .keys li{display:flex;justify-content:space-between;align-items:center;gap:.6em;color:var(--dim)}#ui .keys li span:last-child{display:flex;gap:.25em}
/* settings */
#ui .setp{align-items:center;justify-content:center;background:rgba(3,6,8,.82);z-index:5}
#ui .card{font-size:1.08em;width:min(46em,94vw);max-height:92vh;overflow:auto;background:rgba(9,13,16,.96);border:1px solid var(--line);border-top:.2em solid var(--amber);padding:1.6em 1.8em 1.4em}
#ui .card h2{margin:0;font-size:1.5em;line-height:1;display:flex;align-items:center;justify-content:space-between}
#ui .tabs{display:flex;gap:.2em;margin:1.3em 0 1em;border-bottom:1px solid var(--line)}#ui .tab{padding:.7em 1.1em;font-size:.72em;letter-spacing:.2em;text-transform:uppercase;font-weight:700;color:var(--dim);border-bottom:.2em solid transparent;margin-bottom:-1px;display:flex;gap:.5em;align-items:center}
#ui .tab:hover,#ui .tab:focus-visible{color:var(--ink);outline:none}#ui .tab.on{color:var(--amber);border-color:var(--amber)}
#ui .pane{display:none;min-height:15.5em}#ui .pane.on{display:block}
#ui .row{display:grid;grid-template-columns:13em 1fr 4.2em;align-items:center;gap:1em;padding:.62em 0;border-bottom:1px solid rgba(232,235,230,.07)}#ui .row .n{font-size:.86em}#ui .row .n small{display:block;font-size:.8em;color:var(--dim);margin-top:.15em}#ui .row .v{text-align:right;font-size:.86em;color:var(--amber);font-weight:700}
#ui .sl{display:flex;align-items:center;gap:.5em}#ui .stp{width:1.7em;height:1.7em;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);color:var(--dim);font-weight:700;flex:none}#ui .stp:hover,#ui .stp:focus-visible{border-color:var(--amber);color:var(--amber);outline:none}
#ui input[type=range]{-webkit-appearance:none;appearance:none;flex:1;height:1.7em;background:transparent;margin:0;cursor:pointer;--p:50%}
#ui input[type=range]::-webkit-slider-runnable-track{height:.24em;background:linear-gradient(90deg,var(--amber) var(--p),rgba(232,235,230,.18) var(--p))}#ui input[type=range]::-moz-range-track{height:.24em;background:linear-gradient(90deg,var(--amber) var(--p),rgba(232,235,230,.18) var(--p))}
#ui input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:.6em;height:1.2em;background:var(--ink);margin-top:-.48em;border:0}#ui input[type=range]::-moz-range-thumb{width:.6em;height:1.2em;background:var(--ink);border:0;border-radius:0}
#ui input[type=range]:focus-visible{outline:1px solid var(--amber);outline-offset:.2em}
#ui .opt{display:flex;gap:.35em;flex-wrap:wrap}#ui .opt button{padding:.45em .9em;font-size:.72em;letter-spacing:.16em;text-transform:uppercase;font-weight:700;border:1px solid var(--line);color:var(--dim)}#ui .opt button:hover,#ui .opt button:focus-visible{border-color:var(--ink);color:var(--ink);outline:none}#ui .opt button.on{border-color:var(--amber);color:var(--amber);background:rgba(242,163,27,.1)}
#ui .opt .sw{width:2em;height:1.6em;padding:0;background:var(--c)}#ui .opt .sw.on{outline:.14em solid var(--ink);outline-offset:.14em;background:var(--c)}
#ui .note{font-size:.72em;color:var(--dim);line-height:1.5;margin-top:.9em}#ui .cardf{display:flex;justify-content:space-between;align-items:center;margin-top:1.2em;gap:1em}#ui .cardf .btn{width:13em}
/* after-action report */
#ui .deadp{align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 40%,rgba(40,6,4,.55),rgba(3,6,8,.9) 70%)}
#ui .rep{width:min(44em,94vw);padding:2em 2.2em 1.8em;background:rgba(9,13,16,.94);border:1px solid var(--line);border-top:.2em solid var(--red)}#ui .rep .big{font-size:3.2em;line-height:1;color:var(--red)}#ui .rep .sub{margin:.9em 0 1.4em;font-size:.82em;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);font-weight:600}
#ui .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}#ui .stat{background:rgba(9,13,16,.98);padding:.85em .9em}#ui .stat .lab{display:block;margin-bottom:.5em}#ui .stat .v{font-size:1.45em;line-height:1}#ui .stat.hi .v{color:var(--amber)}
#ui .repf{display:flex;gap:.6em;margin-top:1.5em}#ui .repf .btn{flex:1}#ui .nb{display:inline-block;margin-left:.8em;font-size:.6em;letter-spacing:.2em;font-weight:700;color:#110c02;background:var(--amber);padding:.25em .6em;vertical-align:middle}
@media (max-width:900px){#ui .keys{display:none}#ui .col{padding-left:2.4em}#ui .pitch{left:3.16em;width:24em}}
@media (prefers-reduced-motion:reduce){#ui *{animation-duration:.01s!important;transition-duration:.01s!important}}
`;


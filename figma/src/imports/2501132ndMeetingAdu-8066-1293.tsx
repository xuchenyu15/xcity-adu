import svgPaths from "./svg-4fp13m4j1o";
import imgStartPage from "figma:asset/73c4731a32b6e0652ab16f2bc921df88ed3b255b.png";
import imgImageXhomes from "figma:asset/e2b669ca48005b039a7963f8509bfcf7115eaa55.png";

function StartPage() {
  return (
    <div className="absolute h-[28px] left-0 top-0 w-[1120px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-[560.7px] not-italic text-[#90a1b9] text-[18px] text-center top-0 tracking-[1.3605px] translate-x-[-50%]">STEP 01 / INTENT</p>
    </div>
  );
}

function StartPage1() {
  return (
    <div className="absolute h-[48px] left-0 top-[40px] w-[1120px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[48px] left-[560.22px] not-italic text-[48px] text-center text-white top-[0.5px] tracking-[0.3516px] translate-x-[-50%]">Determine Your Intent</p>
    </div>
  );
}

function StartPage2() {
  return (
    <div className="absolute h-[28px] left-[224px] top-[100px] w-[672px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Light',sans-serif] font-light leading-[28px] left-[336.13px] not-italic text-[#90a1b9] text-[20px] text-center top-0 tracking-[-0.4492px] translate-x-[-50%]">Your ADU strategy adapts to how you plan to use it.</p>
    </div>
  );
}

function Container() {
  return (
    <div className="h-[128px] relative shrink-0 w-full" data-name="Container">
      <StartPage />
      <StartPage1 />
      <StartPage2 />
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="Icon">
          <path d={svgPaths.p11690d80} id="Vector" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33333" />
          <path d={svgPaths.p3b441e00} id="Vector_2" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33333" />
        </g>
      </svg>
    </div>
  );
}

function Container1() {
  return (
    <div className="bg-[#1d293d] relative rounded-[16px] shrink-0 size-[56px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[#1d293d] h-[25px] relative rounded-[16777200px] shrink-0 w-[154.531px]" data-name="Text">
      <div aria-hidden="true" className="absolute border border-[#314158] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[13px] not-italic text-[#90a1b9] text-[10px] top-[5.5px] tracking-[0.6172px] uppercase">Owner-Funded Build</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute content-stretch flex h-[56px] items-start justify-between left-0 top-0 w-[365.602px]" data-name="Container">
      <Container1 />
      <Text />
    </div>
  );
}

function Heading() {
  return (
    <div className="absolute h-[32px] left-0 top-[80px] w-[365.602px]" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-0 tracking-[0.0703px]">Personal or Family Use</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="absolute h-[45.5px] left-0 top-[128px] w-[365.602px]" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-0 not-italic text-[#90a1b9] text-[14px] top-px tracking-[-0.1504px] w-[358px]">{`Build an ADU for personal use or family living. Follows a traditional design & build model.`}</p>
    </div>
  );
}

function Text1() {
  return (
    <div className="content-stretch flex h-[14px] items-start relative shrink-0 w-full" data-name="Text">
      <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] not-italic relative shrink-0 text-[#45556c] text-[12px] tracking-[1.2px] uppercase">Traditional Delivery Path</p>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute content-stretch flex flex-col h-[49px] items-start left-0 pb-0 pl-0 pr-[165.414px] pt-[31.5px] top-[205.5px] w-[365.602px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#1d293d] border-solid border-t inset-0 pointer-events-none" />
      <Text1 />
    </div>
  );
}

function Container4() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[365.602px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container2 />
        <Heading />
        <Paragraph />
        <Container3 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[rgba(15,23,43,0.4)] content-stretch flex flex-col h-[322.5px] items-start left-[686.4px] pl-[34px] pr-[2px] py-[34px] rounded-[24px] top-0 w-[433.602px]" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[24px]" />
      <Container4 />
    </div>
  );
}

function Container5() {
  return <div className="absolute left-[480.45px] rounded-bl-[16777200px] size-[263.68px] top-[-65.86px]" data-name="Container" style={{ backgroundImage: "linear-gradient(135deg, rgba(43, 127, 255, 0.1) 0%, rgba(0, 0, 0, 0) 100%)" }} />;
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[31.724px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 31.724 31.724">
        <g id="Icon">
          <path d={svgPaths.p594eb80} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.64367" />
          <path d={svgPaths.p4ec3380} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.64367" />
        </g>
      </svg>
    </div>
  );
}

function Container6() {
  return (
    <div className="absolute bg-[#2b7fff] content-stretch flex items-center justify-center left-[-2.88px] rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(43,127,255,0.4),0px_4px_6px_-4px_rgba(43,127,255,0.4)] size-[63.448px] top-[-2.88px]" data-name="Container">
      <Icon1 />
    </div>
  );
}

function Text2() {
  return (
    <div className="bg-[#155dfc] h-[23.69px] relative rounded-[16777200px] shadow-[0px_10px_15px_-3px_rgba(21,93,252,0.4),0px_4px_6px_-4px_rgba(21,93,252,0.4)] shrink-0 w-[151.547px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[12.36px] not-italic text-[10px] text-white top-[4.67px] tracking-[0.6172px] uppercase">Free Build Program</p>
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] flex-[1_0_0] min-h-px min-w-px relative rounded-[16777200px] w-[114.587px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[12.36px] not-italic text-[#cad5e2] text-[10px] top-[4.67px] tracking-[0.6172px] uppercase">Recommended</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8.24px] h-[55.62px] items-end left-[460.68px] top-0 w-[151.547px]" data-name="Container">
      <Text2 />
      <Text3 />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute h-[57.68px] left-0 top-0 w-[612.23px]" data-name="Container">
      <Container6 />
      <Container7 />
    </div>
  );
}

function Heading1() {
  return (
    <div className="absolute h-[32.96px] left-0 top-[82.4px] w-[612.23px]" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-[0.06px] tracking-[0.0703px]">{`Rent & Generate Income`}</p>
    </div>
  );
}

function Text4() {
  return (
    <div className="absolute h-[16.995px] left-[270.23px] top-[26.52px] w-[207.489px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[22.75px] left-0 not-italic text-[14px] text-white top-[-2px] tracking-[-0.1504px]">NO upfront construction cost</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="absolute h-[55.105px] left-0 top-[131.84px] w-[612.23px]" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-0 not-italic text-[#cad5e2] text-[14px] top-[1.09px] tracking-[-0.1504px] w-[562px]">Build an ADU as a professionally managed rental. If your property qualifies, XHOMES designs, builds, and operates the unit at</p>
      <Text4 />
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-[477.72px] not-italic text-[#cad5e2] text-[14px] top-[24.52px] tracking-[-0.1504px]">.</p>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[16.48px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.48 16.48">
        <g id="Icon">
          <path d={svgPaths.p387a3900} id="Vector" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.37333" />
          <path d={svgPaths.p2e7e1730} id="Vector_2" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.37333" />
        </g>
      </svg>
    </div>
  );
}

function Text5() {
  return (
    <div className="flex-[1_0_0] h-[16.48px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16px] left-0 not-italic text-[#8ec5ff] text-[12px] top-[1.03px]">WE TAKE THE RISK</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute content-stretch flex gap-[8.24px] h-[16.48px] items-center left-0 top-[24.75px] w-[140.523px]" data-name="Container">
      <Icon2 />
      <Text5 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative shrink-0 size-[16.48px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.48 16.48">
        <g id="Icon">
          <path d={svgPaths.p1734b80} id="Vector" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.37333" />
          <path d={svgPaths.p2b1dc200} id="Vector_2" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.37333" />
          <path d={svgPaths.p13dbc480} id="Vector_3" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.37333" />
        </g>
      </svg>
    </div>
  );
}

function Text6() {
  return (
    <div className="flex-[1_0_0] h-[16.48px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16px] left-0 not-italic text-[#8ec5ff] text-[12px] top-[1.03px]">REVENUE PARTICIPATION</p>
      </div>
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute content-stretch flex gap-[8.24px] h-[16.48px] items-center left-[157px] top-[24.75px] w-[182.173px]" data-name="Container">
      <Icon3 />
      <Text6 />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute border-[rgba(49,65,88,0.5)] border-solid border-t h-[42.23px] left-0 top-[219.91px] w-[612.23px]" data-name="Container">
      <Container9 />
      <Container10 />
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute h-[262.135px] left-[33.02px] top-[33.02px] w-[612.23px]" data-name="Container">
      <Container8 />
      <Heading1 />
      <Paragraph1 />
      <Container11 />
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-[rgba(28,57,142,0.2)] border-2 border-[#2b7fff] border-solid h-[332.175px] left-[-9.94px] overflow-clip rounded-[24px] shadow-[0px_0px_0px_1px_rgba(81,162,255,0.5),0px_25px_60px_-12px_rgba(59,130,246,0.5)] top-[-12.84px] w-[682.27px]" data-name="Button">
      <Container5 />
      <Container12 />
    </div>
  );
}

function StartPage3() {
  return (
    <div className="h-[322.5px] relative shrink-0 w-full" data-name="StartPage">
      <Button />
      <Button1 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d="M21 21L16.66 16.66" id="Vector" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p19568f00} id="Vector_2" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container13() {
  return (
    <div className="bg-[#1d293d] relative rounded-[14px] shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon4 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[28px] relative shrink-0 w-[104.883px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[18px] text-white top-0 tracking-[-0.4395px]">Still Exploring</p>
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="bg-[rgba(43,127,255,0.1)] h-[17.328px] relative rounded-[4px] shrink-0 w-[94.969px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[13.333px] left-[8px] not-italic text-[#51a2ff] text-[10px] top-[2.5px] tracking-[0.1172px]">EXPLORE FIRST</p>
      </div>
    </div>
  );
}

function Container14() {
  return (
    <div className="content-stretch flex gap-[12px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
      <Heading2 />
      <Text7 />
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#90a1b9] text-[14px] top-[0.5px] tracking-[-0.1504px]">Not ready to decide. Explore site feasibility and exterior placement. You can change your intent later.</p>
    </div>
  );
}

function Container15() {
  return (
    <div className="flex-[1_0_0] h-[52px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Container14 />
        <Paragraph2 />
      </div>
    </div>
  );
}

function Text8() {
  return (
    <div className="flex-[1_0_0] h-[16px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px tracking-[0.6px] uppercase">No Commitment Required</p>
      </div>
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M3.33333 8H12.6667" id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1d405500} id="Vector_2" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Container16() {
  return (
    <div className="h-[16px] relative shrink-0 w-[201.734px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text8 />
        <Icon5 />
      </div>
    </div>
  );
}

function StartPage4() {
  return (
    <div className="bg-[rgba(15,23,43,0.2)] h-[102px] relative rounded-[16px] shrink-0 w-full" data-name="StartPage">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[25px] py-px relative size-full">
          <Container13 />
          <Container15 />
          <Container16 />
        </div>
      </div>
    </div>
  );
}

function Container17() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] h-[448.5px] items-start relative shrink-0 w-full" data-name="Container">
      <StartPage3 />
      <StartPage4 />
    </div>
  );
}

function Button2() {
  return (
    <div className="absolute h-[56px] left-[382.05px] rounded-[14px] top-[38px] w-[108.266px]" data-name="Button">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-[54.5px] not-italic text-[#90a1b9] text-[16px] text-center top-[15.5px] tracking-[-0.3125px] translate-x-[-50%]">BACK</p>
    </div>
  );
}

function StartPage5() {
  return (
    <div className="flex-[1_0_0] h-[28px] min-h-px min-w-px relative" data-name="StartPage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-[52.5px] not-italic text-[#0f172b] text-[18px] text-center top-0 tracking-[-0.4395px] translate-x-[-50%]">NEXT PHASE</p>
      </div>
    </div>
  );
}

function Icon6() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="absolute bg-white content-stretch flex gap-[12px] h-[68px] items-center left-[506.31px] px-[48px] py-0 rounded-[16px] top-[32px] w-[231.641px]" data-name="Button">
      <StartPage5 />
      <Icon6 />
    </div>
  );
}

function Container18() {
  return (
    <div className="h-[100px] relative shrink-0 w-full" data-name="Container">
      <Button2 />
      <Button3 />
    </div>
  );
}

function Container19() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[48px] h-[772.5px] items-start left-[173px] top-[160px] w-[1120px]" data-name="Container">
      <Container />
      <Container17 />
      <Container18 />
    </div>
  );
}

function StartPage6() {
  return (
    <div className="h-[932.5px] overflow-clip relative shrink-0 w-full" data-name="StartPage">
      <Container19 />
    </div>
  );
}

function BrandFeatures() {
  return <div className="bg-[#020618] h-[36px] shrink-0 w-full" data-name="BrandFeatures" />;
}

function App() {
  return (
    <div className="absolute bg-[#020618] content-stretch flex flex-col items-start left-0 top-0 w-[1466px]" data-name="App">
      <StartPage6 />
      <BrandFeatures />
    </div>
  );
}

function Container20() {
  return <div className="absolute h-[919px] left-0 opacity-20 top-[50px] w-[1466px]" data-name="Container" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\\'0 0 1466 919\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\' preserveAspectRatio=\\\'none\\\'><rect x=\\\'0\\\' y=\\\'0\\\' height=\\\'100%\\\' width=\\\'100%\\\' fill=\\\'url(%23grad)\\\' opacity=\\\'1\\\'/><defs><radialGradient id=\\\'grad\\\' gradientUnits=\\\'userSpaceOnUse\\\' cx=\\\'0\\\' cy=\\\'0\\\' r=\\\'10\\\' gradientTransform=\\\'matrix(0 -114.02 -114.02 0 422.5 459.5)\\\'><stop stop-color=\\\'rgba(26,160,235,1)\\\' offset=\\\'0\\\'/><stop stop-color=\\\'rgba(20,120,176,0.75)\\\' offset=\\\'0.125\\\'/><stop stop-color=\\\'rgba(13,80,118,0.5)\\\' offset=\\\'0.25\\\'/><stop stop-color=\\\'rgba(7,40,59,0.25)\\\' offset=\\\'0.375\\\'/><stop stop-color=\\\'rgba(0,0,0,0)\\\' offset=\\\'0.5\\\'/></radialGradient></defs></svg>')" }} />;
}

function StartPage7() {
  return (
    <div className="absolute h-[919px] left-0 opacity-18 top-[50px] w-[1466px]" data-name="StartPage">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgStartPage} />
    </div>
  );
}

function StartPage8() {
  return <div className="absolute h-[919px] left-0 opacity-2 top-[50px] w-[1466px]" data-name="StartPage" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 0.10881%, rgba(0, 0, 0, 0) 0.10881%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0) 0%)" }} />;
}

function ImageXhomes() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Image (XHOMES)">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageXhomes} />
    </div>
  );
}

function Button4() {
  return (
    <div className="absolute content-stretch flex h-[24px] items-center left-[32px] top-[24px] w-[36px]" data-name="Button">
      <ImageXhomes />
    </div>
  );
}

function Button5() {
  return (
    <div className="h-[32.5px] relative rounded-[16777200px] shrink-0 w-[70.695px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[35px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">Models</p>
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="h-[32.5px] relative rounded-[16777200px] shrink-0 w-[101.961px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[51px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">How It Works</p>
      </div>
    </div>
  );
}

function Button7() {
  return (
    <div className="flex-[1_0_0] h-[32.5px] min-h-px min-w-px relative rounded-[16777200px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[52.5px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">How You Earn</p>
      </div>
    </div>
  );
}

function Navigation() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[4px] h-[42.5px] items-center left-[585.27px] px-[5px] py-px rounded-[16777200px] top-[14.75px] w-[295.445px]" data-name="Navigation">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.05)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Button5 />
      <Button6 />
      <Button7 />
    </div>
  );
}

function Button8() {
  return (
    <div className="bg-[#155dfc] flex-[1_0_0] h-[23px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[14.5px] not-italic text-[10px] text-center text-white top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">En</p>
      </div>
    </div>
  );
}

function Button9() {
  return (
    <div className="h-[23px] relative rounded-[4px] shrink-0 w-[26px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold','Noto_Sans_JP:Bold',sans-serif] font-bold leading-[15px] left-[13px] not-italic text-[#90a1b9] text-[10px] text-center top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">中</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="bg-[rgba(15,23,43,0.6)] h-[33px] relative rounded-[10px] shrink-0 w-[68.492px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#314158] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-start pb-px pt-[5px] px-[5px] relative size-full">
        <Button8 />
        <Button9 />
      </div>
    </div>
  );
}

function Container22() {
  return <div className="bg-[#314158] h-[24px] shrink-0 w-px" data-name="Container" />;
}

function Button10() {
  return (
    <div className="bg-white flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[44px] not-italic text-[#0f172b] text-[14px] text-center top-[10.5px] tracking-[-0.1504px] translate-x-[-50%]">Sign In</p>
      </div>
    </div>
  );
}

function Container23() {
  return (
    <div className="absolute content-stretch flex gap-[20px] h-[40px] items-center left-[1237.41px] top-[16px] w-[196.586px]" data-name="Container">
      <Container21 />
      <Container22 />
      <Button10 />
    </div>
  );
}

function Container24() {
  return <div className="bg-[#00a6f4] rounded-[16777200px] shrink-0 size-[12px]" data-name="Container" />;
}

function Container25() {
  return <div className="bg-[#00a6f4] h-[2px] shrink-0 w-[96px]" data-name="Container" />;
}

function Container26() {
  return <div className="bg-[#314158] h-[2px] shrink-0 w-[96px]" data-name="Container" />;
}

function Container27() {
  return <div className="bg-[#314158] rounded-[16777200px] shrink-0 size-[12px]" data-name="Container" />;
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <Container24 />
      <Container25 />
      <Container24 />
      <Container26 />
      <Container27 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal gap-[85px] items-center leading-[16px] not-italic relative shrink-0 text-[#62748e] text-[12px] w-full">
      <p className="css-ew64yg relative shrink-0">Eligibility</p>
      <p className="css-ew64yg relative shrink-0">Context</p>
      <p className="css-ew64yg relative shrink-0">Typology</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[9px] items-center left-[573px] top-[94px] w-[319px]">
      <Frame />
      <Frame1 />
    </div>
  );
}

function GlobalHeader() {
  return (
    <div className="absolute bg-[rgba(2,6,24,0.9)] h-[122px] left-0 top-0 w-[1466px]" data-name="GlobalHeader">
      <Button4 />
      <Navigation />
      <Container23 />
      <Frame2 />
    </div>
  );
}

function StartPage9() {
  return (
    <div className="absolute h-[28px] left-0 top-0 w-[1120px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[28px] left-[560.7px] not-italic text-[#90a1b9] text-[18px] text-center top-0 tracking-[1.3605px] translate-x-[-50%]">STEP 01 / INTENT</p>
    </div>
  );
}

function StartPage10() {
  return (
    <div className="absolute h-[48px] left-0 top-[40px] w-[1120px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[48px] left-[560.22px] not-italic text-[48px] text-center text-white top-[0.5px] tracking-[0.3516px] translate-x-[-50%]">Determine Your Intent</p>
    </div>
  );
}

function StartPage11() {
  return (
    <div className="absolute h-[28px] left-[224px] top-[100px] w-[672px]" data-name="StartPage">
      <p className="absolute css-ew64yg font-['Inter:Light',sans-serif] font-light leading-[28px] left-[336.13px] not-italic text-[#90a1b9] text-[20px] text-center top-0 tracking-[-0.4492px] translate-x-[-50%]">Your ADU strategy adapts to how you plan to use it.</p>
    </div>
  );
}

function Container28() {
  return (
    <div className="h-[128px] relative shrink-0 w-full" data-name="Container">
      <StartPage9 />
      <StartPage10 />
      <StartPage11 />
    </div>
  );
}

function Container29() {
  return <div className="absolute left-[466.4px] rounded-bl-[16777200px] size-[256px] top-[-64px]" data-name="Container" style={{ backgroundImage: "linear-gradient(135deg, rgba(43, 127, 255, 0.1) 0%, rgba(0, 0, 0, 0) 100%)" }} />;
}

function Icon7() {
  return (
    <div className="relative shrink-0 size-[28px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
        <g id="Icon">
          <path d={svgPaths.p275e0300} id="Vector" stroke="var(--stroke-0, #51A2FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33333" />
          <path d={svgPaths.p3997a780} id="Vector_2" stroke="var(--stroke-0, #51A2FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.33333" />
        </g>
      </svg>
    </div>
  );
}

function Container30() {
  return (
    <div className="bg-[rgba(43,127,255,0.2)] relative rounded-[16px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] shrink-0 size-[56px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon7 />
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="bg-[rgba(28,57,142,0.5)] flex-[1_0_0] min-h-px min-w-px relative rounded-[16777200px] w-[149.133px]" data-name="Text">
      <div aria-hidden="true" className="absolute border border-[rgba(43,127,255,0.3)] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[13px] not-italic text-[#bedbff] text-[10px] top-[5.5px] tracking-[0.6172px] uppercase">Free Build Program</p>
      </div>
    </div>
  );
}

function Text10() {
  return (
    <div className="bg-[rgba(255,255,255,0.1)] h-[23px] relative rounded-[16777200px] shrink-0 w-[111.25px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[12px] not-italic text-[#cad5e2] text-[10px] top-[4.5px] tracking-[0.6172px] uppercase">Recommended</p>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="h-[56px] relative shrink-0 w-[149.133px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-end relative size-full">
        <Text9 />
        <Text10 />
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="absolute content-stretch flex h-[56px] items-start justify-between left-0 top-0 w-[594.398px]" data-name="Container">
      <Container30 />
      <Container31 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="absolute h-[32px] left-0 top-[80px] w-[594.398px]" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-0 tracking-[0.0703px]">{`Rent & Generate Income`}</p>
    </div>
  );
}

function Text11() {
  return (
    <div className="absolute content-stretch flex h-[16.5px] items-start left-[262.36px] top-[25.75px] w-[201.445px]" data-name="Text">
      <p className="css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[22.75px] not-italic relative shrink-0 text-[14px] text-white tracking-[-0.1504px]">NO upfront construction cost</p>
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="absolute h-[53.5px] left-0 top-[128px] w-[594.398px]" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-0 not-italic text-[#cad5e2] text-[14px] top-px tracking-[-0.1504px] w-[545px]">Build an ADU as a professionally managed rental. If your property qualifies, XHOMES designs, builds, and operates the unit at</p>
      <Text11 />
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-[463.8px] not-italic text-[#cad5e2] text-[14px] top-[23.75px] tracking-[-0.1504px]">.</p>
    </div>
  );
}

function Icon8() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p639ae80} id="Vector" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p17134c00} id="Vector_2" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text12() {
  return (
    <div className="flex-[1_0_0] h-[16px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16px] left-0 not-italic text-[#8ec5ff] text-[12px] top-px">WE TAKE THE RISK</p>
      </div>
    </div>
  );
}

function Container33() {
  return (
    <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-0 top-[24px] w-[136.43px]" data-name="Container">
      <Icon8 />
      <Text12 />
    </div>
  );
}

function Icon9() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d={svgPaths.p26ef3000} id="Vector" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p18635ff0} id="Vector_2" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d="M4 8H4.00667M12 8H12.0067" id="Vector_3" stroke="var(--stroke-0, #8EC5FF)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Text13() {
  return (
    <div className="flex-[1_0_0] h-[16px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[16px] left-0 not-italic text-[#8ec5ff] text-[12px] top-px">REVENUE PARTICIPATION</p>
      </div>
    </div>
  );
}

function Container34() {
  return (
    <div className="absolute content-stretch flex gap-[8px] h-[16px] items-center left-[152.43px] top-[24px] w-[176.867px]" data-name="Container">
      <Icon9 />
      <Text13 />
    </div>
  );
}

function Container35() {
  return (
    <div className="absolute border-[rgba(49,65,88,0.5)] border-solid border-t h-[41px] left-0 top-[213.5px] w-[594.398px]" data-name="Container">
      <Container33 />
      <Container34 />
    </div>
  );
}

function Container36() {
  return (
    <div className="absolute h-[254.5px] left-[32px] top-[32px] w-[594.398px]" data-name="Container">
      <Container32 />
      <Heading3 />
      <Paragraph3 />
      <Container35 />
    </div>
  );
}

function Button11() {
  return (
    <div className="absolute bg-[rgba(15,23,43,0.6)] border-2 border-[rgba(43,127,255,0.3)] border-solid h-[322.5px] left-0 overflow-clip rounded-[24px] top-0 w-[662.398px]" data-name="Button">
      <Container29 />
      <Container36 />
    </div>
  );
}

function Icon10() {
  return (
    <div className="relative shrink-0 size-[28.84px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28.84 28.84">
        <g id="Icon">
          <path d={svgPaths.p162cfd00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.40334" />
          <path d={svgPaths.p548100} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.40334" />
        </g>
      </svg>
    </div>
  );
}

function Container37() {
  return (
    <div className="bg-[#314158] relative rounded-[16px] shrink-0 size-[57.68px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon10 />
      </div>
    </div>
  );
}

function Text14() {
  return (
    <div className="bg-[#1d293d] h-[25.75px] relative rounded-[16777200px] shrink-0 w-[159.167px]" data-name="Text">
      <div aria-hidden="true" className="absolute border border-[#314158] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[13.39px] not-italic text-[#90a1b9] text-[10px] top-[5.7px] tracking-[0.6172px] uppercase">Owner-Funded Build</p>
      </div>
    </div>
  );
}

function Container38() {
  return (
    <div className="absolute content-stretch flex h-[57.68px] items-start justify-between left-0 top-0 w-[376.57px]" data-name="Container">
      <Container37 />
      <Text14 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="absolute h-[32.96px] left-0 top-[82.4px] w-[376.57px]" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-[0.06px] tracking-[0.0703px]">Personal or Family Use</p>
    </div>
  );
}

function Paragraph4() {
  return (
    <div className="absolute h-[46.865px] left-0 top-[131.84px] w-[376.57px]" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-0 not-italic text-[#90a1b9] text-[14px] top-[1.09px] tracking-[-0.1504px] w-[368px]">{`Build an ADU for personal use or family living. Follows a traditional design & build model.`}</p>
    </div>
  );
}

function Text15() {
  return (
    <div className="h-[14.42px] relative shrink-0 w-full" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#45556c] text-[12px] top-0 tracking-[1.2px] uppercase">Traditional Delivery Path</p>
    </div>
  );
}

function Container39() {
  return (
    <div className="absolute content-stretch flex flex-col h-[50.47px] items-start left-0 pb-0 pl-0 pr-[170.376px] pt-[32.445px] top-[211.67px] w-[376.57px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#1d293d] border-solid border-t inset-0 pointer-events-none" />
      <Text15 />
    </div>
  );
}

function Container40() {
  return (
    <div className="h-[262.135px] relative shrink-0 w-[376.57px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container38 />
        <Heading4 />
        <Paragraph4 />
        <Container39 />
      </div>
    </div>
  );
}

function Button12() {
  return (
    <div className="absolute bg-[#1d293d] content-stretch flex flex-col h-[332.175px] items-start left-[679.89px] pb-[2px] pl-[35.02px] pr-[2px] pt-[35.02px] rounded-[24px] top-[-12.84px] w-[446.61px]" data-name="Button">
      <div aria-hidden="true" className="absolute border-2 border-[#cad5e2] border-solid inset-0 pointer-events-none rounded-[24px] shadow-[0px_0px_0px_1px_rgba(144,161,185,0.5),0px_25px_60px_-12px_rgba(255,255,255,0.1)]" />
      <Container40 />
    </div>
  );
}

function StartPage12() {
  return (
    <div className="h-[322.5px] relative shrink-0 w-full" data-name="StartPage">
      <Button11 />
      <Button12 />
    </div>
  );
}

function Icon11() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d="M21 21L16.66 16.66" id="Vector" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          <path d={svgPaths.p19568f00} id="Vector_2" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function Container41() {
  return (
    <div className="bg-[#1d293d] relative rounded-[14px] shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon11 />
      </div>
    </div>
  );
}

function Heading5() {
  return (
    <div className="h-[28px] relative shrink-0 w-[104.883px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[18px] text-white top-0 tracking-[-0.4395px]">Still Exploring</p>
      </div>
    </div>
  );
}

function Text16() {
  return (
    <div className="bg-[rgba(43,127,255,0.1)] h-[17.328px] relative rounded-[4px] shrink-0 w-[94.969px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[13.333px] left-[8px] not-italic text-[#51a2ff] text-[10px] top-[2.5px] tracking-[0.1172px]">EXPLORE FIRST</p>
      </div>
    </div>
  );
}

function Container42() {
  return (
    <div className="content-stretch flex gap-[12px] h-[28px] items-center relative shrink-0 w-full" data-name="Container">
      <Heading5 />
      <Text16 />
    </div>
  );
}

function Paragraph5() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-ew64yg font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[#90a1b9] text-[14px] top-[0.5px] tracking-[-0.1504px]">Not ready to decide. Explore site feasibility and exterior placement. You can change your intent later.</p>
    </div>
  );
}

function Container43() {
  return (
    <div className="flex-[1_0_0] h-[52px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start relative size-full">
        <Container42 />
        <Paragraph5 />
      </div>
    </div>
  );
}

function Text17() {
  return (
    <div className="flex-[1_0_0] h-[16px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[#62748e] text-[12px] top-px tracking-[0.6px] uppercase">No Commitment Required</p>
      </div>
    </div>
  );
}

function Icon12() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon">
          <path d="M3.33333 8H12.6667" id="Vector" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1d405500} id="Vector_2" stroke="var(--stroke-0, #62748E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function Container44() {
  return (
    <div className="h-[16px] relative shrink-0 w-[201.734px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Text17 />
        <Icon12 />
      </div>
    </div>
  );
}

function StartPage13() {
  return (
    <div className="bg-[rgba(15,23,43,0.2)] h-[102px] relative rounded-[16px] shrink-0 w-full" data-name="StartPage">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[24px] items-center px-[25px] py-px relative size-full">
          <Container41 />
          <Container43 />
          <Container44 />
        </div>
      </div>
    </div>
  );
}

function Container45() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] h-[448.5px] items-start relative shrink-0 w-full" data-name="Container">
      <StartPage12 />
      <StartPage13 />
    </div>
  );
}

function Button13() {
  return (
    <div className="absolute h-[56px] left-[382.05px] rounded-[14px] top-[38px] w-[108.266px]" data-name="Button">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-[54.5px] not-italic text-[#90a1b9] text-[16px] text-center top-[15.5px] tracking-[-0.3125px] translate-x-[-50%]">BACK</p>
    </div>
  );
}

function StartPage14() {
  return (
    <div className="flex-[1_0_0] h-[28px] min-h-px min-w-px relative" data-name="StartPage">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-[52.5px] not-italic text-[#0f172b] text-[18px] text-center top-0 tracking-[-0.4395px] translate-x-[-50%]">NEXT PHASE</p>
      </div>
    </div>
  );
}

function Icon13() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, #0F172B)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Button14() {
  return (
    <div className="absolute bg-white content-stretch flex gap-[12px] h-[68px] items-center left-[506.31px] px-[48px] py-0 rounded-[16px] top-[32px] w-[231.641px]" data-name="Button">
      <StartPage14 />
      <Icon13 />
    </div>
  );
}

function Container46() {
  return (
    <div className="h-[100px] relative shrink-0 w-full" data-name="Container">
      <Button13 />
      <Button14 />
    </div>
  );
}

function Container47() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[48px] h-[772.5px] items-start left-[173px] top-[160px] w-[1120px]" data-name="Container">
      <Container28 />
      <Container45 />
      <Container46 />
    </div>
  );
}

function ImageXhomes1() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Image (XHOMES)">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageXhomes} />
    </div>
  );
}

function Button15() {
  return (
    <div className="absolute content-stretch flex h-[24px] items-center left-[32px] top-[24px] w-[36px]" data-name="Button">
      <ImageXhomes1 />
    </div>
  );
}

function Button16() {
  return (
    <div className="h-[32.5px] relative rounded-[16777200px] shrink-0 w-[70.695px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[35px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">Models</p>
      </div>
    </div>
  );
}

function Button17() {
  return (
    <div className="h-[32.5px] relative rounded-[16777200px] shrink-0 w-[101.961px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[51px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">How It Works</p>
      </div>
    </div>
  );
}

function Button18() {
  return (
    <div className="flex-[1_0_0] h-[32.5px] min-h-px min-w-px relative rounded-[16777200px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16.5px] left-[52.5px] not-italic text-[#90a1b9] text-[11px] text-center top-[8.5px] tracking-[0.0645px] translate-x-[-50%]">How You Earn</p>
      </div>
    </div>
  );
}

function Navigation1() {
  return (
    <div className="absolute bg-[rgba(255,255,255,0.1)] content-stretch flex gap-[4px] h-[42.5px] items-center left-[585.27px] px-[5px] py-px rounded-[16777200px] top-[14.75px] w-[295.445px]" data-name="Navigation">
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.05)] border-solid inset-0 pointer-events-none rounded-[16777200px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
      <Button16 />
      <Button17 />
      <Button18 />
    </div>
  );
}

function Button19() {
  return (
    <div className="bg-[#155dfc] flex-[1_0_0] h-[23px] min-h-px min-w-px relative rounded-[4px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[15px] left-[14.5px] not-italic text-[10px] text-center text-white top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">En</p>
      </div>
    </div>
  );
}

function Button20() {
  return (
    <div className="h-[23px] relative rounded-[4px] shrink-0 w-[26px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold','Noto_Sans_JP:Bold',sans-serif] font-bold leading-[15px] left-[13px] not-italic text-[#90a1b9] text-[10px] text-center top-[4.5px] tracking-[0.1172px] translate-x-[-50%]">中</p>
      </div>
    </div>
  );
}

function Container48() {
  return (
    <div className="bg-[rgba(15,23,43,0.6)] h-[33px] relative rounded-[10px] shrink-0 w-[68.492px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#314158] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[4px] items-start pb-px pt-[5px] px-[5px] relative size-full">
        <Button19 />
        <Button20 />
      </div>
    </div>
  );
}

function Container49() {
  return <div className="bg-[#314158] h-[24px] shrink-0 w-px" data-name="Container" />;
}

function Button21() {
  return (
    <div className="bg-white flex-[1_0_0] h-[40px] min-h-px min-w-px relative rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-[44px] not-italic text-[#0f172b] text-[14px] text-center top-[10.5px] tracking-[-0.1504px] translate-x-[-50%]">Sign In</p>
      </div>
    </div>
  );
}

function Container50() {
  return (
    <div className="absolute content-stretch flex gap-[20px] h-[40px] items-center left-[1237.41px] top-[16px] w-[196.586px]" data-name="Container">
      <Container48 />
      <Container49 />
      <Button21 />
    </div>
  );
}

function Container51() {
  return <div className="bg-[#00a6f4] rounded-[16777200px] shrink-0 size-[12px]" data-name="Container" />;
}

function Container52() {
  return <div className="bg-[#00a6f4] h-[2px] shrink-0 w-[96px]" data-name="Container" />;
}

function Container53() {
  return <div className="bg-[#314158] h-[2px] shrink-0 w-[96px]" data-name="Container" />;
}

function Container54() {
  return <div className="bg-[#314158] rounded-[16777200px] shrink-0 size-[12px]" data-name="Container" />;
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[12px] items-center relative shrink-0">
      <Container51 />
      <Container52 />
      <Container51 />
      <Container53 />
      <Container54 />
    </div>
  );
}

function Frame4() {
  return (
    <div className="content-stretch flex font-['Inter:Regular',sans-serif] font-normal gap-[85px] items-center leading-[16px] not-italic relative shrink-0 text-[#62748e] text-[12px] w-full">
      <p className="css-ew64yg relative shrink-0">Eligibility</p>
      <p className="css-ew64yg relative shrink-0">Context</p>
      <p className="css-ew64yg relative shrink-0">Typology</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[9px] items-center left-[573px] top-[94px] w-[319px]">
      <Frame3 />
      <Frame4 />
    </div>
  );
}

function GlobalHeader1() {
  return (
    <div className="absolute bg-[rgba(2,6,24,0.9)] h-[122px] left-px top-0 w-[1466px]" data-name="GlobalHeader">
      <Button15 />
      <Navigation1 />
      <Container50 />
      <Frame5 />
    </div>
  );
}

function StartPage15() {
  return (
    <div className="h-[932.5px] overflow-clip relative shrink-0 w-full" data-name="StartPage">
      <Container47 />
      <GlobalHeader1 />
    </div>
  );
}

function BrandFeatures1() {
  return <div className="bg-[#020618] h-[36px] shrink-0 w-full" data-name="BrandFeatures" />;
}

function App1() {
  return (
    <div className="absolute bg-[#020618] content-stretch flex flex-col h-[969px] items-start left-0 top-0 w-[1466px]" data-name="App">
      <StartPage15 />
      <BrandFeatures1 />
    </div>
  );
}

function Container55() {
  return <div className="absolute h-[919px] left-0 opacity-20 top-[50px] w-[1466px]" data-name="Container" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\\'0 0 1466 919\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\' preserveAspectRatio=\\\'none\\\'><rect x=\\\'0\\\' y=\\\'0\\\' height=\\\'100%\\\' width=\\\'100%\\\' fill=\\\'url(%23grad)\\\' opacity=\\\'1\\\'/><defs><radialGradient id=\\\'grad\\\' gradientUnits=\\\'userSpaceOnUse\\\' cx=\\\'0\\\' cy=\\\'0\\\' r=\\\'10\\\' gradientTransform=\\\'matrix(0 -114.93 -114.93 0 998.82 568.57)\\\'><stop stop-color=\\\'rgba(47,145,241,1)\\\' offset=\\\'0\\\'/><stop stop-color=\\\'rgba(35,109,181,0.75)\\\' offset=\\\'0.125\\\'/><stop stop-color=\\\'rgba(24,73,121,0.5)\\\' offset=\\\'0.25\\\'/><stop stop-color=\\\'rgba(12,36,60,0.25)\\\' offset=\\\'0.375\\\'/><stop stop-color=\\\'rgba(0,0,0,0)\\\' offset=\\\'0.5\\\'/></radialGradient></defs></svg>')" }} />;
}

function StartPage16() {
  return (
    <div className="absolute h-[919px] left-0 opacity-18 top-[50px] w-[1466px]" data-name="StartPage">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgStartPage} />
    </div>
  );
}

function StartPage17() {
  return <div className="absolute h-[919px] left-0 opacity-2 top-[50px] w-[1466px]" data-name="StartPage" style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 0.10881%, rgba(0, 0, 0, 0) 0.10881%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0) 0%)" }} />;
}

function Component2501132ndMeetingAdu() {
  return (
    <div className="absolute bg-white h-[969px] left-[-1512px] top-[5px] w-[1466px]" data-name="250113_2nd Meeting_ADU">
      <App1 />
      <Container55 />
      <StartPage16 />
      <StartPage17 />
    </div>
  );
}

export default function Component2501132ndMeetingAdu1() {
  return (
    <div className="bg-white relative size-full" data-name="250113_2nd Meeting_ADU">
      <App />
      <Container20 />
      <StartPage7 />
      <StartPage8 />
      <GlobalHeader />
      <Component2501132ndMeetingAdu />
    </div>
  );
}
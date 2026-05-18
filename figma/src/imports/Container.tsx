import svgPaths from "./svg-jihsq676hn";
import imgImageExteriorFacade from "figma:asset/117b373854101687ab4b514162b4e9f0edb44c1d.png";
import imgImageFloorPlan from "figma:asset/0c0058a44e64ce11f403316189ab318180b41b82.png";
import imgImage from "figma:asset/d10f3550218c85b53e191d7508f7c9187ddb4cb8.png";
import imgImage1 from "figma:asset/3e25ba3ce0e0e795f6771b534171066284683502.png";
import imgImage2 from "figma:asset/16f5db61d13fcb7803bacf1c6597dc9b8b0ef446.png";
import imgImage3 from "figma:asset/cf81f23267f127a93016c528c6ae8521e296cfa8.png";
import imgImage4 from "figma:asset/5f91af4a2543859f74c0cdca44b792962e121e87.png";
import imgImage5 from "figma:asset/18332cb1ad97fb2363eafb00938d3b55abe86205.png";
import imgImageIndusPod from "figma:asset/4487ba8a92fba78eeb5ef7fd5507fedb5836a873.png";
import imgImageClassic from "figma:asset/f0165c20f91f0c2d29de9cc3aaf8e3bc065cc790.png";

function ImageExteriorFacade() {
  return (
    <div className="absolute h-[548.438px] left-0 top-0 w-[975px]" data-name="Image (Exterior Facade)">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImageExteriorFacade} />
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[16px] size-[12px] top-[10px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
        <g clipPath="url(#clip0_6118_3034)" id="Icon">
          <path d={svgPaths.p4662800} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.pe4d3e40} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          <path d={svgPaths.p2054780} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_6118_3034">
            <rect fill="white" height="12" width="12" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[rgba(0,0,0,0.5)] h-[32px] left-[822.2px] rounded-[16777200px] top-[500.44px] w-[136.805px]" data-name="Button">
      <Icon />
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-[78.5px] not-italic text-[12px] text-center text-white top-[9px] translate-x-[-50%]">See all photos</p>
    </div>
  );
}

function Container() {
  return (
    <div className="bg-[#e2e8f0] h-[548.438px] overflow-clip relative rounded-[14px] shrink-0 w-full" data-name="Container">
      <ImageExteriorFacade />
      <Button />
    </div>
  );
}

function ImageFloorPlan() {
  return (
    <div className="h-[297.625px] relative shrink-0 w-[413.5px]" data-name="Image (Floor Plan)">
      <img alt="" className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageFloorPlan} />
    </div>
  );
}

function Container1() {
  return (
    <div className="bg-white col-[1] css-por8k5 relative rounded-[14px] row-[1] self-stretch shrink-0" data-name="Container">
      <div className="content-stretch flex items-center justify-center overflow-clip p-px relative rounded-[inherit] size-full">
        <ImageFloorPlan />
      </div>
      <div aria-hidden="true" className="absolute border border-[#e2e8f0] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[32px] relative shrink-0 w-[463.5px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-0 tracking-[0.0703px]">Floor Plan Specifications</p>
      </div>
    </div>
  );
}

function Text() {
  return (
    <div className="h-[24px] relative shrink-0 w-[91.844px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#62748e] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Interior Area</p>
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[28px] relative shrink-0 w-[81.648px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[20px] text-white top-0 tracking-[-0.4492px]">600 sqft</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[61px] relative shrink-0 w-[463.5px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#1d293d] border-b border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-px pt-0 px-0 relative size-full">
        <Text />
        <Text1 />
      </div>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[24px] relative shrink-0 w-[101.211px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#62748e] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Configuration</p>
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[28px] relative shrink-0 w-[123.695px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[20px] text-white top-0 tracking-[-0.4492px]">1 Bed / 1 Bath</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[61px] relative shrink-0 w-[463.5px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#1d293d] border-b border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-px pt-0 px-0 relative size-full">
        <Text2 />
        <Text3 />
      </div>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[24px] relative shrink-0 w-[86.438px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[24px] left-0 not-italic text-[#62748e] text-[16px] top-[-0.5px] tracking-[-0.3125px]">Dimensions</p>
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[28px] relative shrink-0 w-[96.922px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[20px] text-white top-0 tracking-[-0.4492px] w-[97px]">{`16' × 37.5'`}</p>
      </div>
    </div>
  );
}

function Container4() {
  return (
    <div className="h-[61px] relative shrink-0 w-[463.5px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#1d293d] border-b border-solid inset-0 pointer-events-none" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-px pt-0 px-0 relative size-full">
        <Text4 />
        <Text5 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative w-[463.5px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start justify-between relative size-full">
        <Container2 />
        <Container3 />
        <Container4 />
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="col-[2] content-stretch css-vsca90 flex flex-col gap-[32px] items-start relative row-[1] self-stretch shrink-0" data-name="Container">
      <Heading1 />
      <Container5 />
    </div>
  );
}

function Container7() {
  return (
    <div className="gap-[48px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] grid-rows-[repeat(1,_minmax(0,_1fr))] h-[468.625px] pb-[40px] pt-[81px] px-0 relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(226,232,240,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Container1 />
      <Container6 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[28px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[28px] left-0 not-italic text-[20px] text-white top-0 tracking-[-0.4492px]">Tour Your Modular Home</p>
    </div>
  );
}

function Image() {
  return (
    <div className="h-[176.813px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage} />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[176.813px] items-start left-[660.66px] overflow-clip rounded-[16px] top-0 w-[314.336px]" data-name="Container">
      <Image />
    </div>
  );
}

function Image1() {
  return (
    <div className="h-[176.813px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
    </div>
  );
}

function Container9() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[176.813px] items-start left-[660.66px] overflow-clip rounded-[16px] top-[192.81px] w-[314.336px]" data-name="Container">
      <Image1 />
    </div>
  );
}

function Image2() {
  return (
    <div className="h-[176.805px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage2} />
    </div>
  );
}

function Container10() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[176.805px] items-start left-0 overflow-clip rounded-[16px] top-[385.63px] w-[314.328px]" data-name="Container">
      <Image2 />
    </div>
  );
}

function Image3() {
  return (
    <div className="h-[176.813px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage3} />
    </div>
  );
}

function Container11() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[176.813px] items-start left-[330.33px] overflow-clip rounded-[16px] top-[385.63px] w-[314.336px]" data-name="Container">
      <Image3 />
    </div>
  );
}

function Image4() {
  return (
    <div className="h-[176.813px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage4} />
    </div>
  );
}

function Container12() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[176.813px] items-start left-[660.66px] overflow-clip rounded-[16px] top-[385.63px] w-[314.336px]" data-name="Container">
      <Image4 />
    </div>
  );
}

function Image5() {
  return (
    <div className="h-[369.625px] relative shrink-0 w-full" data-name="Image">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage5} />
    </div>
  );
}

function Container13() {
  return (
    <div className="absolute bg-[#e2e8f0] content-stretch flex flex-col h-[369.625px] items-start left-0 overflow-clip rounded-[16px] top-0 w-[644.664px]" data-name="Container">
      <Image5 />
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[562.438px] relative shrink-0 w-full" data-name="Container">
      <Container8 />
      <Container9 />
      <Container10 />
      <Container11 />
      <Container12 />
      <Container13 />
    </div>
  );
}

function Container15() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] h-[655.438px] items-start pb-0 pt-[33px] px-0 relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(226,232,240,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Heading3 />
      <Container14 />
    </div>
  );
}

function Container16() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[64px] h-[1800.5px] items-start left-[24px] top-[80px] w-[975px]" data-name="Container">
      <Container />
      <Container7 />
      <Container15 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="h-[32px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[32px] left-0 not-italic text-[24px] text-white top-0 tracking-[0.0703px]">Browse other options</p>
    </div>
  );
}

function ImageIndusPod() {
  return (
    <div className="h-[112px] relative shrink-0 w-full" data-name="Image (IndusPod)">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImageIndusPod} />
    </div>
  );
}

function Container17() {
  return (
    <div className="bg-[#e2e8f0] h-[112px] relative rounded-[16px] shrink-0 w-[160px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <ImageIndusPod />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[36px] relative shrink-0 w-[384px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="css-4hzbpn flex-[1_0_0] font-['Inter:Bold',sans-serif] font-bold leading-[36px] min-h-px min-w-px not-italic relative text-[30px] text-white tracking-[0.3955px]">IndusPod</p>
      </div>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[20px] relative shrink-0 w-[384px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-0 not-italic text-[#62748e] text-[14px] top-[0.5px] tracking-[-0.1504px]">Industrial Minimalism</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="flex-[1_0_0] h-[112px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start justify-center relative size-full">
        <Heading2 />
        <Paragraph />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Container19() {
  return (
    <div className="bg-[#1d293d] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Container20() {
  return (
    <div className="bg-[#0f172b] col-[1] css-por8k5 relative rounded-[32px] row-[1] self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[32px] items-center pl-[25px] pr-[33px] py-px relative size-full">
          <Container17 />
          <Container18 />
          <Container19 />
        </div>
      </div>
    </div>
  );
}

function ImageClassic() {
  return (
    <div className="h-[112px] relative shrink-0 w-full" data-name="Image (Classic)">
      <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImageClassic} />
    </div>
  );
}

function Container21() {
  return (
    <div className="bg-[#e2e8f0] h-[112px] relative rounded-[16px] shrink-0 w-[160px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <ImageClassic />
      </div>
    </div>
  );
}

function Heading5() {
  return (
    <div className="h-[36px] relative shrink-0 w-[384px]" data-name="Heading 4">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="css-4hzbpn flex-[1_0_0] font-['Inter:Bold',sans-serif] font-bold leading-[36px] min-h-px min-w-px not-italic relative text-[30px] text-white tracking-[0.3955px]">Classic</p>
      </div>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[20px] relative shrink-0 w-[384px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-ew64yg font-['Inter:Medium',sans-serif] font-medium leading-[20px] left-0 not-italic text-[#62748e] text-[14px] top-[0.5px] tracking-[-0.1504px]">Timeless Modular</p>
      </div>
    </div>
  );
}

function Container22() {
  return (
    <div className="flex-[1_0_0] h-[112px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[4px] items-start justify-center relative size-full">
        <Heading5 />
        <Paragraph1 />
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, #90A1B9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Container23() {
  return (
    <div className="bg-[#1d293d] relative rounded-[16777200px] shrink-0 size-[48px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Container24() {
  return (
    <div className="bg-[#0f172b] col-[2] css-por8k5 relative rounded-[32px] row-[1] self-stretch shrink-0" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[32px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[32px] items-center pl-[25px] pr-[33px] py-px relative size-full">
          <Container21 />
          <Container22 />
          <Container23 />
        </div>
      </div>
    </div>
  );
}

function Container25() {
  return (
    <div className="gap-[32px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] grid-rows-[repeat(1,_minmax(0,_1fr))] h-[162px] relative shrink-0 w-full" data-name="Container">
      <Container20 />
      <Container24 />
    </div>
  );
}

function Container26() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[32px] h-[339px] items-start left-[24px] pb-0 pt-[65px] px-0 top-[1976.5px] w-[1396px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[rgba(226,232,240,0.1)] border-solid border-t inset-0 pointer-events-none" />
      <Heading4 />
      <Container25 />
    </div>
  );
}

function FullPageModelDetail() {
  return (
    <div className="absolute h-[2395.5px] left-0 top-0 w-[1444px]" data-name="FullPageModelDetail">
      <Container16 />
      <Container26 />
    </div>
  );
}

function Heading() {
  return (
    <div className="content-stretch flex h-[36px] items-start relative shrink-0 w-full" data-name="Heading 2">
      <p className="css-4hzbpn flex-[1_0_0] font-['Inter:Bold',sans-serif] font-bold leading-[36px] min-h-px min-w-px not-italic relative text-[30px] text-white tracking-[0.3955px]">Aura</p>
    </div>
  );
}

function Paragraph2() {
  return (
    <div className="h-[45.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[22.75px] left-0 not-italic text-[#90a1b9] text-[14px] top-px tracking-[-0.1504px] w-[296px]">Soft contemporary design focusing on natural light and organic materials.</p>
    </div>
  );
}

function Container27() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[89.5px] items-start left-0 top-0 w-[325px]" data-name="Container">
      <Heading />
      <Paragraph2 />
    </div>
  );
}

function Heading6() {
  return (
    <div className="h-[16px] opacity-70 relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[12px] text-white top-px tracking-[0.6px] uppercase">Interior Layout</p>
    </div>
  );
}

function Container28() {
  return <div className="bg-[#2b7fff] rounded-[16777200px] shrink-0 size-[8px]" data-name="Container" />;
}

function Container29() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#2b7fff] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center p-px relative size-full">
        <Container28 />
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[72.25px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[14px] text-white top-[0.5px] tracking-[-0.1504px] w-[73px]">1B1B Suite</p>
      </div>
    </div>
  );
}

function Label() {
  return (
    <div className="bg-[rgba(43,127,255,0.05)] h-[54px] relative rounded-[14px] shrink-0 w-full" data-name="Label">
      <div aria-hidden="true" className="absolute border border-[#2b7fff] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_0px_0px_1px_#2b7fff]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center pl-[17px] pr-px py-px relative size-full">
          <Container29 />
          <Text6 />
        </div>
      </div>
    </div>
  );
}

function Container30() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#90a1b9] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[20px] relative shrink-0 w-[74.094px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[14px] text-white top-[0.5px] tracking-[-0.1504px] w-[75px]">2B1B Suite</p>
      </div>
    </div>
  );
}

function Label1() {
  return (
    <div className="h-[54px] relative rounded-[14px] shrink-0 w-full" data-name="Label">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center pl-[17px] pr-px py-px relative size-full">
          <Container30 />
          <Text7 />
        </div>
      </div>
    </div>
  );
}

function Container31() {
  return (
    <div className="relative rounded-[16777200px] shrink-0 size-[16px]" data-name="Container">
      <div aria-hidden="true" className="absolute border border-[#90a1b9] border-solid inset-0 pointer-events-none rounded-[16777200px]" />
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[20px] relative shrink-0 w-[75.93px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute css-4hzbpn font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[14px] text-white top-[0.5px] tracking-[-0.1504px] w-[76px]">2B2B Suite</p>
      </div>
    </div>
  );
}

function Label2() {
  return (
    <div className="h-[54px] relative rounded-[14px] shrink-0 w-full" data-name="Label">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <div className="flex flex-row items-center size-full">
        <div className="content-stretch flex gap-[12px] items-center pl-[17px] pr-px py-px relative size-full">
          <Container31 />
          <Text8 />
        </div>
      </div>
    </div>
  );
}

function Container32() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[186px] items-start relative shrink-0 w-full" data-name="Container">
      <Label />
      <Label1 />
      <Label2 />
    </div>
  );
}

function Container33() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] h-[218px] items-start left-0 top-[121.5px] w-[325px]" data-name="Container">
      <Heading6 />
      <Container32 />
    </div>
  );
}

function Heading7() {
  return (
    <div className="h-[16px] opacity-70 relative shrink-0 w-full" data-name="Heading 4">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[16px] left-0 not-italic text-[12px] text-white top-px tracking-[0.6px] uppercase">Extensions</p>
    </div>
  );
}

function Text9() {
  return (
    <div className="absolute h-[20px] left-[17px] top-[19px] w-[85.695px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[14px] text-white top-[0.5px] tracking-[-0.1504px]">Left Balcony</p>
    </div>
  );
}

function Container34() {
  return <div className="bg-white h-[16px] rounded-[16777200px] shrink-0 w-full" data-name="Container" />;
}

function Container35() {
  return (
    <div className="absolute bg-[#cad5e2] content-stretch flex flex-col h-[24px] items-start left-[268px] pb-0 pl-[4px] pr-[20px] pt-[4px] rounded-[16777200px] top-[17px] w-[40px]" data-name="Container">
      <Container34 />
    </div>
  );
}

function Label3() {
  return (
    <div className="h-[58px] relative rounded-[14px] shrink-0 w-full" data-name="Label">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Text9 />
      <Container35 />
    </div>
  );
}

function Text10() {
  return (
    <div className="absolute h-[20px] left-[17px] top-[19px] w-[94.992px]" data-name="Text">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[20px] left-0 not-italic text-[14px] text-white top-[0.5px] tracking-[-0.1504px]">Right Balcony</p>
    </div>
  );
}

function Container36() {
  return <div className="bg-white h-[16px] rounded-[16777200px] shrink-0 w-full" data-name="Container" />;
}

function Container37() {
  return (
    <div className="absolute bg-[#cad5e2] content-stretch flex flex-col h-[24px] items-start left-[268px] pb-0 pl-[4px] pr-[20px] pt-[4px] rounded-[16777200px] top-[17px] w-[40px]" data-name="Container">
      <Container36 />
    </div>
  );
}

function Label4() {
  return (
    <div className="h-[58px] relative rounded-[14px] shrink-0 w-full" data-name="Label">
      <div aria-hidden="true" className="absolute border border-[#1d293d] border-solid inset-0 pointer-events-none rounded-[14px]" />
      <Text10 />
      <Container37 />
    </div>
  );
}

function Container38() {
  return (
    <div className="content-stretch flex flex-col gap-[12px] h-[128px] items-start relative shrink-0 w-full" data-name="Container">
      <Label3 />
      <Label4 />
    </div>
  );
}

function Container39() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[16px] h-[160px] items-start left-0 top-[379.5px] w-[325px]" data-name="Container">
      <Heading7 />
      <Container38 />
    </div>
  );
}

function Paragraph3() {
  return (
    <div className="h-[40px] opacity-70 relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute css-4hzbpn font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-[138.75px] not-italic text-[#90a1b9] text-[14px] text-center top-[0.5px] tracking-[-0.1504px] translate-x-[-50%] w-[271px]">Exterior finishes, interior colors, and furniture packages are customizable later.</p>
    </div>
  );
}

function Container40() {
  return (
    <div className="absolute bg-[rgba(29,41,61,0.5)] content-stretch flex flex-col h-[88px] items-start left-0 pb-0 pt-[24px] px-[24px] rounded-[14px] top-[579.5px] w-[325px]" data-name="Container">
      <Paragraph3 />
    </div>
  );
}

function Icon3() {
  return (
    <div className="absolute left-[225.27px] size-[20px] top-[18px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M4.16667 10H15.8333" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p1ae0b780} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-[#155dfc] h-[56px] left-0 rounded-[14px] shadow-[0px_10px_15px_-3px_rgba(43,127,255,0.2),0px_4px_6px_-4px_rgba(43,127,255,0.2)] top-[707.5px] w-[325px]" data-name="Button">
      <p className="absolute css-ew64yg font-['Inter:Bold',sans-serif] font-bold leading-[24px] left-[149.23px] not-italic text-[16px] text-center text-white top-[15.5px] tracking-[-0.3125px] translate-x-[-50%]">Check Availability</p>
      <Icon3 />
    </div>
  );
}

function FullPageModelDetail1() {
  return (
    <div className="absolute h-[763.5px] left-[1095px] top-[80px] w-[325px]" data-name="FullPageModelDetail">
      <Container27 />
      <Container33 />
      <Container39 />
      <Container40 />
      <Button1 />
    </div>
  );
}

export default function Container41() {
  return (
    <div className="bg-[#020618] relative size-full" data-name="Container">
      <FullPageModelDetail />
      <FullPageModelDetail1 />
    </div>
  );
}
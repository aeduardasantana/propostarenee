(function(){
  "use strict";
  var form=document.getElementById("proposalForm");
  var preview=document.getElementById("pdfPreview");
  var empty=document.getElementById("empty");
  var status=document.getElementById("status");
  var previewUrl=null;

  function field(id){return document.getElementById(id)}
  function value(id){return field(id).value.trim()}
  function setStatus(message,error){
    status.textContent=message||"";
    status.className=error?"error":"";
  }
  function parseMoney(text){
    var clean=String(text).replace(/[R$\s]/g,"").replace(/\./g,"").replace(",",".");
    var number=Number(clean);
    return Number.isFinite(number)?number:NaN;
  }
  function formatMoney(number){
    return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(number);
  }
  var units=["","um","dois","três","quatro","cinco","seis","sete","oito","nove"];
  var teens=["dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  var tens=["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  var hundreds=["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  function underThousand(n){
    if(n===0)return "";
    if(n===100)return "cem";
    var parts=[];
    var h=Math.floor(n/100),r=n%100;
    if(h)parts.push(hundreds[h]);
    if(r){
      var tail="";
      if(r<10)tail=units[r];
      else if(r<20)tail=teens[r-10];
      else{
        tail=tens[Math.floor(r/10)];
        if(r%10)tail+=" e "+units[r%10];
      }
      parts.push(tail);
    }
    return parts.join(" e ");
  }
  function integerWords(n){
    if(n===0)return "zero";
    var parts=[];
    var millions=Math.floor(n/1000000);
    var thousands=Math.floor((n%1000000)/1000);
    var rest=n%1000;
    if(millions)parts.push((millions===1?"um":underThousand(millions))+" "+(millions===1?"milhão":"milhões"));
    if(thousands)parts.push((thousands===1?"":underThousand(thousands)+" ")+"mil");
    if(rest)parts.push(underThousand(rest));
    return parts.join(" e ");
  }
  function moneyWords(number){
    var cents=Math.round(number*100);
    var reais=Math.floor(cents/100);
    var centavos=cents%100;
    var result=integerWords(reais)+" "+(reais===1?"real":"reais");
    if(centavos)result+=" e "+integerWords(centavos)+" "+(centavos===1?"centavo":"centavos");
    return result;
  }
  field("date").value=new Date().toISOString().slice(0,10);
  field("amount").addEventListener("blur",function(){
    var n=parseMoney(this.value);
    if(!Number.isFinite(n))return;
    this.value=formatMoney(n);
    if(!field("amountWords").dataset.manual)field("amountWords").value=moneyWords(n);
  });
  field("amountWords").addEventListener("input",function(){this.dataset.manual="true"});

  function collect(){
    var amount=parseMoney(value("amount"));
    return{
      client:value("client"),place:value("place"),services:value("services"),
      exclusions:value("exclusions"),terms:value("terms"),materialSupplier:value("materialSupplier"),amount:amount,
      amountLabel:formatMoney(amount),amountWords:value("amountWords")||moneyWords(amount),
      techName:value("techName")||"Renee Lacerda",techPhone:value("techPhone"),
      clientSigner:value("clientSigner"),clientDoc:value("clientDoc"),date:value("date")
    };
  }
  function formatDate(iso){
    if(!iso)return "";
    var p=iso.split("-");
    return p[2]+"/"+p[1]+"/"+p[0];
  }
  function safeFilename(name,isoDate){
    var client=String(name||"CLIENTE").replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim()||"CLIENTE";
    var date=String(isoDate||"").split("-").reverse().join("_")||"SEM_DATA";
    return "PROPOSTA RL SERVIÇOS - "+client+" - "+date+".pdf";
  }

  function buildPdf(data){
    var jsPDF=window.jspdf.jsPDF;
    var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4",compress:true});
    var bg=field("letterhead");
    var left=28,maxWidth=154,bodyBottom=259,y=74,page=1;
    function background(){
      doc.addImage(bg,"PNG",0,0,210,297,undefined,"FAST");
      doc.setTextColor(30,33,36);
    }
    function newPage(){
      doc.addPage();
      page++;
      background();
      y=74;
    }
    function need(height){if(y+height>bodyBottom)newPage()}
    function heading(text){
      need(12);
      doc.setFillColor(244,196,0);
      doc.rect(left,y-4,3,7,"F");
      doc.setFont("helvetica","bold");
      doc.setFontSize(11);
      doc.text(text,left+7,y);
      y+=8;
    }
    function paragraph(text,options){
      options=options||{};
      doc.setFont("helvetica",options.bold?"bold":"normal");
      doc.setFontSize(options.size||10);
      var paragraphs=String(text).split(/\n/);
      paragraphs.forEach(function(part,index){
        if(!part.trim()){y+=4;return}
        var lines=doc.splitTextToSize(part.trim(),options.width||maxWidth);
        lines.forEach(function(line){
          need(5.2);
          doc.text(line,options.x||left,y,{align:options.align||"left"});
          y+=5.2;
        });
        if(index<paragraphs.length-1)y+=1.5;
      });
      y+=3;
    }
    function signatureBlock(){
      need(56);
      y+=9;
      var lineY=y;
      doc.setDrawColor(35,38,41);
      doc.line(25,lineY,93,lineY);
      doc.line(117,lineY,185,lineY);
      doc.setFont("helvetica","bold");
      doc.setFontSize(9.5);
      doc.text("RESPONSÁVEL TÉCNICO",59,lineY+5,{align:"center"});
      doc.setFont("helvetica","bolditalic");
      doc.setFontSize(11);
      doc.text(data.techName,59,lineY+11,{align:"center"});
      doc.setFont("helvetica","normal");
      doc.setFontSize(8.5);
      if(data.techPhone)doc.text("Fone "+data.techPhone,59,lineY+16,{align:"center"});
      doc.setFont("helvetica","bold");
      doc.setFontSize(9.5);
      doc.text("RESPONSÁVEL PELO EMPREENDIMENTO",151,lineY+5,{align:"center"});
      doc.setFont("helvetica","normal");
      doc.setFontSize(9);
      if(data.clientSigner)doc.text(data.clientSigner,151,lineY+11,{align:"center"});
      if(data.clientDoc)doc.text("CPF/CNPJ: "+data.clientDoc,151,lineY+16,{align:"center"});
      doc.setFontSize(9.5);
      doc.text("Goiânia, "+formatDate(data.date)+".",105,lineY+31,{align:"center"});
    }

    background();
    doc.setFont("helvetica","bold");
    doc.setFontSize(15);
    doc.text("PROPOSTA COMERCIAL",105,y,{align:"center"});
    y+=13;
    doc.setFontSize(10);
    doc.text("À",left,y); y+=5;
    doc.text(data.client,left,y); y+=5;
    doc.setFont("helvetica","normal");
    doc.text(data.place,left,y); y+=10;
    paragraph("A R.L Serviços Elétricos Ltda apresenta esta proposta comercial para a execução dos serviços descritos a seguir, comprometendo-se com a qualidade, a organização e o cumprimento das normas técnicas e de segurança aplicáveis.");
    heading("1. DESCRIÇÃO DOS SERVIÇOS E DA MONTAGEM");
    paragraph(data.services);
    if(data.exclusions){
      paragraph("ITENS NÃO INCLUÍDOS", {bold:true});
      paragraph(data.exclusions);
    }

    newPage();
    heading("2. CONDIÇÕES COMERCIAIS E GERAIS");
    paragraph("A execução será realizada por profissionais treinados e orientados quanto às normas técnicas e de segurança aplicáveis. Quando o serviço envolver instalações vinculadas à rede de distribuição de energia, serão observadas as exigências da concessionária responsável.");
    heading("CONDIÇÕES COMERCIAIS");
    paragraph(data.terms);
    paragraph("A responsabilidade pelo fornecimento de materiais e equipamentos seguirá o que estiver definido na descrição dos serviços. Os valores incluem os impostos, as taxas, os encargos sociais e as despesas diretamente relacionadas aos serviços e fornecimentos expressamente previstos nesta proposta.");

    newPage();
    heading("3. OBSERVAÇÕES");
    paragraph("01) A equipe executora dos serviços será composta por profissionais treinados e habilitados, em conformidade com as normas da concessionária Equatorial.");
    if(data.materialSupplier==="contractor"){
      paragraph("02) Os materiais necessários para a execução dos serviços serão fornecidos pela contratante ("+data.client+"), conforme definido nesta proposta.");
    }else{
      paragraph("02) Os materiais necessários para a execução dos serviços serão fornecidos pela contratada, R.L Serviços Elétricos Ltda, conforme definido nesta proposta.");
    }
    heading("4. VALOR DA PROPOSTA");
    need(25);
    doc.setDrawColor(60,64,68);
    doc.setFillColor(246,247,248);
    doc.roundedRect(left,y-4,maxWidth,22,2,2,"FD");
    doc.setFont("helvetica","bold");
    doc.setFontSize(13);
    doc.text("VALOR TOTAL: "+data.amountLabel,left+6,y+4);
    doc.setFontSize(10);
    var words=doc.splitTextToSize("("+data.amountWords+")",maxWidth-12);
    doc.text(words,left+6,y+11);
    y+=27+(words.length-1)*4;
    paragraph("A assinatura desta proposta representa a concordância com os serviços, as condições comerciais, o valor apresentado e as responsabilidades estabelecidas.");
    signatureBlock();

    var total=doc.getNumberOfPages();
    for(var i=1;i<=total;i++){
      doc.setPage(i);
      doc.setFont("helvetica","normal");
      doc.setFontSize(7.5);
      doc.setTextColor(95,99,103);
      doc.text("Página "+i+" de "+total,105,264,{align:"center"});
    }
    return doc;
  }

  function validate(){
    if(!form.reportValidity())return false;
    if(!Number.isFinite(parseMoney(value("amount")))){
      setStatus("Informe um valor válido para a proposta.",true);
      field("amount").focus();
      return false;
    }
    if(!field("letterhead").complete){
      setStatus("Aguarde o carregamento do papel timbrado.",true);
      return false;
    }
    return true;
  }
  function showPreview(){
    if(!validate())return;
    try{
      var doc=buildPdf(collect());
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      previewUrl=URL.createObjectURL(doc.output("blob"));
      preview.src=previewUrl;
      preview.style.display="block";
      empty.style.display="none";
      setStatus("Pré-visualização atualizada.",false);
    }catch(error){
      console.error(error);
      setStatus("Não foi possível gerar o PDF. Verifique os campos e tente novamente.",true);
    }
  }
  document.getElementById("previewBtn").addEventListener("click",showPreview);
  form.addEventListener("submit",function(event){
    event.preventDefault();
    if(!validate())return;
    try{
      var data=collect();
      buildPdf(data).save(safeFilename(data.client,data.date));
      setStatus("PDF gerado e baixado com sucesso.",false);
    }catch(error){
      console.error(error);
      setStatus("Não foi possível baixar o PDF. Tente novamente.",true);
    }
  });
})();
